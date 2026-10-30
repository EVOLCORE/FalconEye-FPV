"""
FalconEye FPV - Model Export Utility
Converts PyTorch YOLO11 models to ONNX and optimized TensorRT (.engine) format for edge deployment.
"""

import argparse
import sys
from pathlib import Path

def export_model(weights_path: str, format_target: str = "engine", half: bool = True, imgsz: int = 640):
    try:
        from ultralytics import YOLO
    except ImportError:
        print("[ERROR] ultralytics package not installed. Run: pip install ultralytics")
        sys.exit(1)

    weights_file = Path(weights_path)
    if not weights_file.exists():
        print(f"[ERROR] Weights file '{weights_path}' does not exist.")
        sys.exit(1)

    print("=" * 60)
    print(f"🦅 FalconEye FPV: Exporting Model [{weights_path}] -> [{format_target.upper()}]")
    print(f"• Half Precision (FP16): {half}")
    print(f"• Input Resolution: {imgsz}x{imgsz}")
    print("=" * 60)

    model = YOLO(weights_path)

    if format_target.lower() == "engine":
        # Export directly to NVIDIA TensorRT engine
        exported_path = model.export(
            format="engine",
            half=half,
            imgsz=imgsz,
            device=0,
            workspace=4,  # Max TensorRT GPU workspace (GB)
            dynamic=False # Fixed batch size for lowest latency
        )
    elif format_target.lower() == "onnx":
        # Export to standardized ONNX
        exported_path = model.export(
            format="onnx",
            half=half,
            imgsz=imgsz,
            opset=12,
            simplify=True
        )
    else:
        raise ValueError(f"Unsupported format: {format_target}. Choose 'engine' or 'onnx'.")

    print(f"\n✅ Export successful! Compiled model saved at: {exported_path}")
    return exported_path

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export FalconEye YOLO11 model to TensorRT or ONNX")
    parser.add_argument("--weights", type=str, required=True, help="Path to .pt weights file")
    parser.add_argument("--format", type=str, default="onnx", choices=["engine", "onnx"], help="Target format")
    parser.add_argument("--half", action="store_true", default=True, help="Use FP16 half precision")
    parser.add_argument("--imgsz", type=int, default=640, help="Inference image resolution")
    
    args = parser.parse_args()
    export_model(args.weights, args.format, args.half, args.imgsz)
