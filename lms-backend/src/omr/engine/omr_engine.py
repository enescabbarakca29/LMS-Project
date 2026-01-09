import sys, json, cv2
import numpy as np

# -------------------------
# 0) OpenCV compat helpers
# -------------------------
def find_contours(bin_img):
    out = cv2.findContours(bin_img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if len(out) == 2:
        cnts, hier = out
    else:
        _, cnts, hier = out
    return cnts, hier


# -------------------------
# 1) Geometry helpers
# -------------------------
def order_points(pts):
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]    # top-left
    rect[2] = pts[np.argmax(s)]    # bottom-right
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)] # top-right
    rect[3] = pts[np.argmax(diff)] # bottom-left
    return rect


def four_point_transform(image, pts):
    rect = order_points(pts.astype("float32"))
    (tl, tr, br, bl) = rect

    wA = np.linalg.norm(br - bl)
    wB = np.linalg.norm(tr - tl)
    hA = np.linalg.norm(tr - br)
    hB = np.linalg.norm(tl - bl)

    maxW = int(max(wA, wB))
    maxH = int(max(hA, hB))

    if maxW < 50 or maxH < 50:
        return image.copy(), rect

    dst = np.array([[0, 0], [maxW - 1, 0], [maxW - 1, maxH - 1], [0, maxH - 1]], dtype="float32")
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxW, maxH))
    return warped, rect


# -------------------------
# 2) Document detection
# -------------------------
def _find_quad_from_edges(img_bgr):
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(gray, 50, 150)

    cnts, _ = find_contours(edged)
    if not cnts:
        return None
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)

    for c in cnts[:12]:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4 and cv2.contourArea(approx) > 1000:
            return approx.reshape(4, 2).astype("float32")
    return None


def _find_roi_by_threshold(img_bgr):
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    thr = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 7)

    kernel = np.ones((3, 3), np.uint8)
    thr = cv2.morphologyEx(thr, cv2.MORPH_OPEN, kernel, iterations=1)
    thr = cv2.dilate(thr, kernel, iterations=1)

    cnts, _ = find_contours(thr)
    if not cnts:
        return None

    c = max(cnts, key=cv2.contourArea)
    if cv2.contourArea(c) < 1500:
        return None

    x, y, w, h = cv2.boundingRect(c)
    if w < 50 or h < 50:
        return None

    corners = np.array([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], dtype="float32")
    return corners


def detect_document_corners(img_bgr):
    quad = _find_quad_from_edges(img_bgr)
    if quad is not None:
        return order_points(quad), "edges-quad"

    roi = _find_roi_by_threshold(img_bgr)
    if roi is not None:
        return order_points(roi), "threshold-roi"

    h, w = img_bgr.shape[:2]
    full = np.array([[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]], dtype="float32")
    return full, "full-image"


# -------------------------
# 3) Bubble Reading (Circle-based) ✅ FIXED
# -------------------------
CHOICES = ["A", "B", "C", "D", "E"]

def preprocess_gray(img_bgr):
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    return gray

def threshold_inv(gray):
    thr = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 25, 8)
    kernel = np.ones((2, 2), np.uint8)
    thr = cv2.morphologyEx(thr, cv2.MORPH_OPEN, kernel, iterations=1)
    return thr

def kmeans_1d(vals, k, iters=25):
    vals = np.asarray(vals, dtype=np.float32)
    centers = np.quantile(vals, np.linspace(0.1, 0.9, k)).astype(np.float32)
    for _ in range(iters):
        d = np.abs(vals[:, None] - centers[None, :])
        labels = np.argmin(d, axis=1)
        new_centers = centers.copy()
        for i in range(k):
            mask = labels == i
            if np.any(mask):
                new_centers[i] = np.mean(vals[mask])
        if np.max(np.abs(new_centers - centers)) < 0.5:
            centers = new_centers
            break
        centers = new_centers
    centers.sort()
    return centers

def build_grid_from_circles(circles, questions=10, choices=5):
    xs = circles[:, 0]
    ys = circles[:, 1]
    rs = circles[:, 2]

    col_centers = kmeans_1d(xs, choices)
    row_centers = kmeans_1d(ys, questions)

    grid = [[None for _ in range(choices)] for __ in range(questions)]
    used = set()
    for ri, ry in enumerate(row_centers):
        for ci, cx in enumerate(col_centers):
            best = None
            best_d = 1e18
            for idx, (x, y, r) in enumerate(circles):
                if idx in used:
                    continue
                d = (x - cx) ** 2 + (y - ry) ** 2
                if d < best_d:
                    best_d = d
                    best = (idx, x, y, r)
            if best is not None:
                idx, x, y, r = best
                used.add(idx)
                grid[ri][ci] = (int(x), int(y), int(r))

    med_r = int(np.median(rs))
    return grid, row_centers, col_centers, med_r

def fill_score_in_circle(gray, x, y, r, inner_ratio=0.55):
    rr = max(4, int(r * inner_ratio))
    x1, y1 = max(0, x - rr), max(0, y - rr)
    x2, y2 = min(gray.shape[1], x + rr), min(gray.shape[0], y + rr)
    patch = gray[y1:y2, x1:x2]
    if patch.size == 0:
        return 0.0

    hh, ww = patch.shape[:2]
    yy, xx = np.ogrid[:hh, :ww]
    cy, cx = hh / 2.0, ww / 2.0
    mask = (xx - cx) ** 2 + (yy - cy) ** 2 <= (min(hh, ww) * 0.45) ** 2
    vals = patch[mask]
    if vals.size == 0:
        return 0.0

    mean_intensity = float(np.mean(vals))
    return float(max(0.0, min(1.0, (255.0 - mean_intensity) / 255.0)))

def hough_find_bubble_circles(gray_roi, expected_min=25):
    g = cv2.medianBlur(gray_roi, 5)
    circles = cv2.HoughCircles(
        g,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=52,
        param1=120,
        param2=30,
        minRadius=18,
        maxRadius=40
    )
    if circles is None:
        return None
    circles = np.round(circles[0, :]).astype(int)
    if len(circles) < expected_min:
        return None

    rs = circles[:, 2].astype(np.float32)
    med = float(np.median(rs))
    lo, hi = med * 0.75, med * 1.30
    circles = circles[(rs >= lo) & (rs <= hi)]
    if len(circles) < expected_min:
        return None
    return circles


# ✅ NEW: Dinamik boş algılama + ratio kontrol
def decide_mark(row_scores):
    scores = [float(x) for x in row_scores]
    if len(scores) == 0:
        return None, False

    idx_sorted = np.argsort(scores)[::-1]
    best = int(idx_sorted[0])
    top = float(scores[best])
    second = float(scores[idx_sorted[1]]) if len(scores) > 1 else 0.0

    s_sorted = sorted(scores)
    blank_baseline = (s_sorted[0] + s_sorted[1]) / 2.0  # satırın boş seviyesi

    EMPTY_PAD = 0.08   # boşsa top bu baseline'ı az geçer
    RATIO_MIN = 1.35   # işaretli olunca top/second belirgin artar

    if top < (blank_baseline + EMPTY_PAD):
        return None, False

    ratio = top / (second + 1e-9)
    if ratio < RATIO_MIN:
        return CHOICES[best], True

    return CHOICES[best], False


def read_bubbles_circle(warped_bgr, questions=10, choices=5):
    W, H = 900, 1200
    img = cv2.resize(warped_bgr, (W, H), interpolation=cv2.INTER_AREA)
    cv2.imwrite("warped_resized.jpg", img)

    gray = preprocess_gray(img)
    thr = threshold_inv(gray)
    cv2.imwrite("debug_thresh.jpg", thr)

    roi_x1, roi_y1 = 95, 40
    roi_x2, roi_y2 = 900 - 10, 1200 - 40

    gray_roi = gray[roi_y1:roi_y2, roi_x1:roi_x2]

    circles = hough_find_bubble_circles(gray_roi, expected_min=int(questions * choices * 0.7))
    if circles is None:
        roi_method = "template-fallback"
        roi = thr[roi_y1:roi_y2, roi_x1:roi_x2]
        rw, rh = roi.shape[1], roi.shape[0]
        row_h = rh / questions
        col_w = rw / choices

        answers, uncertain, scores_debug = {}, [], {}

        for qi in range(questions):
            y1 = int(qi * row_h); y2 = int((qi + 1) * row_h)
            row_scores = []
            for ci in range(choices):
                x1 = int(ci * col_w); x2 = int((ci + 1) * col_w)
                cell = roi[y1:y2, x1:x2]
                s = 0.0 if cell.size == 0 else float(np.count_nonzero(cell)) / float(cell.size)
                row_scores.append(float(s))

            scores_debug[str(qi + 1)] = row_scores
            ans, is_unc = decide_mark(row_scores)
            answers[str(qi + 1)] = ans
            if is_unc:
                uncertain.append(str(qi + 1))

        vis = img.copy()
        cv2.rectangle(vis, (roi_x1, roi_y1), (roi_x2, roi_y2), (0,255,0), 3)
        cv2.imwrite("debug_grid.jpg", vis)

        conf = 1.0 - (len(uncertain) / max(questions, 1)) * 0.5
        conf = float(max(0.0, min(1.0, conf)))
        processing = {
            "bubbleReading": {
                "enabled": True, "success": True,
                "method": "grid-density",
                "roi": [roi_x1, roi_y1, roi_x2, roi_y2],
                "roiMethod": roi_method,
                "questions": questions, "choices": choices
            }
        }
        return answers, uncertain, conf, processing, scores_debug, ["warped_resized.jpg", "debug_grid.jpg", "debug_thresh.jpg"]

    circles[:, 0] += roi_x1
    circles[:, 1] += roi_y1

    grid, _, _, med_r = build_grid_from_circles(circles, questions=questions, choices=choices)

    vis = img.copy()
    cv2.rectangle(vis, (roi_x1, roi_y1), (roi_x2, roi_y2), (0,255,0), 2)
    for (x, y, r) in circles:
        cv2.circle(vis, (int(x), int(y)), int(r), (0, 200, 255), 1)
    for ri in range(questions):
        for ci in range(choices):
            if grid[ri][ci] is None:
                continue
            x, y, r = grid[ri][ci]
            cv2.circle(vis, (x, y), int(r * 0.55), (0, 255, 0), 2)
    cv2.imwrite("debug_circles.jpg", vis)

    answers, uncertain, scores_debug = {}, [], {}

    for qi in range(questions):
        row_scores = []
        for ci in range(choices):
            item = grid[qi][ci]
            if item is None:
                row_scores.append(0.0)
                continue
            x, y, r = item
            s = fill_score_in_circle(gray, x, y, r, inner_ratio=0.62)
            row_scores.append(float(s))

        scores_debug[str(qi + 1)] = row_scores
        ans, is_unc = decide_mark(row_scores)
        answers[str(qi + 1)] = ans
        if is_unc:
            uncertain.append(str(qi + 1))

    conf = 1.0 - (len(uncertain) / max(questions, 1)) * 0.5
    conf = float(max(0.0, min(1.0, conf)))

    processing = {
        "bubbleReading": {
            "enabled": True, "success": True,
            "method": "circle-grid",
            "roi": [roi_x1, roi_y1, roi_x2, roi_y2],
            "roiMethod": "fixed-roi-no-question-numbers",
            "questions": questions, "choices": choices,
            "debugCircleCount": int(len(circles)),
            "medianRadius": int(med_r)
        }
    }

    return answers, uncertain, conf, processing, scores_debug, ["warped_resized.jpg", "debug_circles.jpg", "debug_thresh.jpg"]


# -------------------------
# 4) Input + Main
# -------------------------
def read_input_path():
    if len(sys.argv) >= 2 and sys.argv[1].strip():
        return sys.argv[1].strip()
    raw = sys.stdin.read().strip()
    if raw:
        payload = json.loads(raw)
        return payload["image_path"]
    raise ValueError("No input image path provided")


def main():
    try:
        path = read_input_path()
    except Exception as e:
        print(json.dumps({"error": "bad_input", "detail": str(e)}, ensure_ascii=False))
        return

    img = cv2.imread(path)
    if img is None:
        print(json.dumps({"error": "cannot_read_image", "path": path}, ensure_ascii=False))
        return

    corners, method = detect_document_corners(img)
    warped, rect = four_point_transform(img, corners)

    answers, uncertain, conf, processing, scores_debug, artifacts = read_bubbles_circle(
        warped, questions=10, choices=5
    )

    warnings = []
    if uncertain:
        warnings.append(f"{len(uncertain)} soru belirsiz/boş olabilir: {', '.join(uncertain[:10])}")

    result = {
        "cornerDetection": {"enabled": True, "success": True, "method": method, "corners": rect.tolist()},
        "perspectiveCorrection": {"enabled": True, "success": True, "method": "homography"},
        "processing": processing,
        "answers": answers,
        "uncertainAnswers": uncertain,
        "confidence": conf,
        "warnings": warnings,
        "debug": {"rowScores": scores_debug, "artifacts": artifacts}
    }

    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
