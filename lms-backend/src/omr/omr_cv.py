# Legacy prototype – replaced by engine/omr_engine.py

import sys, json, os
import cv2
import numpy as np

def order_points(pts):
    pts = np.array(pts, dtype="float32")
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1)
    tl = pts[np.argmin(s)]
    br = pts[np.argmax(s)]
    tr = pts[np.argmin(diff)]
    bl = pts[np.argmax(diff)]
    return np.array([tl, tr, br, bl], dtype="float32")

def four_point_transform(image, pts):
    rect = order_points(pts)
    (tl, tr, br, bl) = rect
    wA = np.linalg.norm(br - bl)
    wB = np.linalg.norm(tr - tl)
    hA = np.linalg.norm(tr - br)
    hB = np.linalg.norm(tl - bl)
    maxW = int(max(wA, wB))
    maxH = int(max(hA, hB))
    dst = np.array([[0,0],[maxW-1,0],[maxW-1,maxH-1],[0,maxH-1]], dtype="float32")
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxW, maxH))
    return warped, rect.tolist()

def find_paper_corners(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5,5), 0)
    edges = cv2.Canny(blur, 50, 150)

    cnts, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)

    for c in cnts[:10]:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4:
            pts = approx.reshape(4,2)
            return pts.tolist(), True
    return None, False

def extract_bubbles(warped, n_questions=10, choices=5):
    # 1) threshold
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (3,3), 0)
    thr = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]

    # 2) bubble contour candidates
    cnts, _ = cv2.findContours(thr, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    bubbles = []
    for c in cnts:
        x,y,w,h = cv2.boundingRect(c)
        ar = w / float(h)
        area = cv2.contourArea(c)

        # Bu eşikler template'e göre ayarlanır:
        if area < 150 or area > 5000:
            continue
        if ar < 0.7 or ar > 1.3:
            continue
        if w < 10 or h < 10:
            continue

        bubbles.append((x,y,w,h,c))

    # 3) sort by y then x
    bubbles = sorted(bubbles, key=lambda b: (b[1], b[0]))

    # 4) group by rows (soru satırı)
    # Basit yaklaşım: y yakın olanları aynı satır say
    rows = []
    for b in bubbles:
        placed = False
        for row in rows:
            if abs(b[1] - row[0][1]) < 25:  # satır toleransı
                row.append(b)
                placed = True
                break
        if not placed:
            rows.append([b])

    # her row'u x'e göre sırala ve sadece choice kadarını al
    rows = [sorted(r, key=lambda b: b[0])[:choices] for r in rows]
    rows = rows[:n_questions]

    answers = {}
    uncertain = []
    confidences = []

    labels = ["A","B","C","D","E"][:choices]

    for i, row in enumerate(rows, start=1):
        if len(row) < choices:
            answers[str(i)] = None
            uncertain.append(str(i))
            continue

        fills = []
        for (x,y,w,h,c) in row:
            mask = np.zeros(thr.shape, dtype="uint8")
            cv2.drawContours(mask, [c], -1, 255, -1)
            total = cv2.countNonZero(cv2.bitwise_and(thr, thr, mask=mask))
            fills.append(total)

        fills_np = np.array(fills)
        best_idx = int(np.argmax(fills_np))
        sorted_vals = np.sort(fills_np)[::-1]

        # belirsizlik: 1. ve 2. en iyi çok yakınsa
        if len(sorted_vals) >= 2 and (sorted_vals[0] - sorted_vals[1]) < 120:
            answers[str(i)] = labels[best_idx]
            uncertain.append(str(i))
            confidences.append(0.55)
        else:
            answers[str(i)] = labels[best_idx]
            confidences.append(0.9)

    confidence = float(np.mean(confidences)) if confidences else 0.0

    return answers, uncertain, confidence

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error":"missing image path"}))
        sys.exit(1)

    path = sys.argv[1]
    n_questions = int(os.getenv("OMR_QUESTIONS", "10"))
    choices = int(os.getenv("OMR_CHOICES", "5"))

    img = cv2.imread(path)
    if img is None:
        print(json.dumps({"error":"could not read image"}))
        sys.exit(1)

    corners, ok = find_paper_corners(img)
    if not ok:
        print(json.dumps({"error":"paper corners not found"}))
        sys.exit(2)

    warped, rect = four_point_transform(img, corners)
    answers, uncertain, conf = extract_bubbles(warped, n_questions=n_questions, choices=choices)

    out = {
        "page": 1,
        "studentId": None,  # OCR sonra
        "answers": answers,
        "uncertainAnswers": uncertain,
        "confidence": conf,
        "processing": {
            "cornerDetection": {
                "enabled": True,
                "success": True,
                "corners": {
                    "topLeft": rect[0],
                    "topRight": rect[1],
                    "bottomRight": rect[2],
                    "bottomLeft": rect[3],
                },
                "method": "opencv-contours"
            },
            "perspectiveCorrection": {
                "enabled": True,
                "success": True,
                "method": "homography"
            },
            "bubbleReading": {
                "enabled": True,
                "success": True,
                "method": "contours+threshold"
            }
        }
    }

    print(json.dumps(out, ensure_ascii=False))

if __name__ == "__main__":
    main()
