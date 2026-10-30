"""
FalconEye FPV - VisDrone to YOLO Annotation Converter
Converts VisDrone-DET raw text annotations into standardized YOLO normalized bounding box format.
"""

import os
from pathlib import Path
from typing import Tuple

# VisDrone categories mapping (1-indexed in raw dataset)
VISDRONE_CLASSES = {
    1: 0,  # pedestrian -> 0
    2: 1,  # people -> 1
    3: 2,  # bicycle -> 2
    4: 3,  # car -> 3
    5: 4,  # van -> 4
    6: 5,  # truck -> 5
    7: 6,  # tricycle -> 6
    8: 7,  # awning-tricycle -> 7
    9: 8,  # bus -> 8
    10: 9  # motor -> 9
    # 0 (ignored) and 11 (others) are skipped
}

def convert_visdrone_line(line: str, img_w: int, img_h: int) -> str:
    """Converts a single line from VisDrone format to YOLO format."""
    parts = line.strip().split(',')
    if len(parts) < 8:
        return ""

    bbox_left = float(parts[0])
    bbox_top = float(parts[1])
    bbox_w = float(parts[2])
    bbox_h = float(parts[3])
    score = int(parts[4])
    category = int(parts[5])

    # Filter out ignored regions (category 0) and others (category 11)
    if category not in VISDRONE_CLASSES or score == 0:
        return ""

    class_id = VISDRONE_CLASSES[category]

    # Convert to normalized center_x, center_y, width, height
    cx = (bbox_left + bbox_w / 2.0) / img_w
    cy = (bbox_top + bbox_h / 2.0) / img_h
    nw = bbox_w / img_w
    nh = bbox_h / img_h

    # Clamp coordinates to [0, 1]
    cx = max(0.0, min(1.0, cx))
    cy = max(0.0, min(1.0, cy))
    nw = max(0.0, min(1.0, nw))
    nh = max(0.0, min(1.0, nh))

    return f"{class_id} {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}"


def convert_visdrone_dir(raw_anno_dir: str, output_dir: str, default_img_shape: Tuple[int, int] = (1920, 1080)):
    """Converts an entire directory of VisDrone annotation files."""
    in_path = Path(raw_anno_dir)
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    txt_files = list(in_path.glob("*.txt"))
    print(f"Converting {len(txt_files)} VisDrone annotation files from {raw_anno_dir} -> {output_dir}")

    converted_count = 0
    for txt_file in txt_files:
        with open(txt_file, 'r') as f_in:
            lines = f_in.readlines()

        yolo_lines = []
        for line in lines:
            converted = convert_visdrone_line(line, default_img_shape[0], default_img_shape[1])
            if converted:
                yolo_lines.append(converted)

        out_file = out_path / txt_file.name
        with open(out_file, 'w') as f_out:
            f_out.write("\n".join(yolo_lines) + "\n")
        converted_count += 1

    print(f"✅ Successfully converted {converted_count} files.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Convert VisDrone annotations to YOLO format")
    parser.add_argument("--input", type=str, required=True, help="Path to raw VisDrone annotations folder")
    parser.add_argument("--output", type=str, required=True, help="Output folder for YOLO annotations")
    args = parser.parse_args()
    convert_visdrone_dir(args.input, args.output)
