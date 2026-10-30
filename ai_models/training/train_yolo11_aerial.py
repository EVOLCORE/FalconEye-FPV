"""
FalconEye FPV - YOLO11 Aerial Training & Fine-Tuning Pipeline
Specialized for detecting vehicles, people, and objects from aerial / drone perspectives.
Dataset: VisDrone-DET / DOTA / Custom Drone Bounding Boxes
"""

import argparse
import os
import sys
from pathlib import Path

def train_aerial_model(
    model_size: str = "yolo11n.pt",
    data_yaml: str = "VisDrone.yaml",
    epochs: int = 50,
    imgsz: int = 640,
    batch_size: int = 16,
    device: str = "0",
    project_dir: str = "runs/aerial_train",
    name: str = "falconeye_yolo11_aerial"
):
    try:
        from ultralytics import YOLO
    except ImportError:
        print("[ERROR] ultralytics package not installed. Run: pip install ultralytics")
        sys.exit(1)

    print("=" * 60)
    print(f"🦅 FalconEye FPV: Starting Aerial Model Training ({model_size})")
    print(f"• Dataset Config: {data_yaml}")
    print(f"• Target Image Size: {imgsz}x{imgsz}")
    print(f"• Epochs: {epochs} | Batch: {batch_size}")
    print("=" * 60)

    # Load baseline pre-trained model
    model = YOLO(model_size)

    # Train with aerial augmentations (flips, scale jitter, perspective shift)
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch_size,
        device=device,
        project=project_dir,
        name=name,
        save=True,
        save_period=5,
        workers=4,
        # Aerial augmentation tuning:
        degrees=15.0,        # Drone pitch/roll induces rotational shifts
        translate=0.15,
        scale=0.5,           # Vital for tiny distant vehicles to close-up targets
        shear=5.0,
        flipud=0.0,          # Don't flip upside down for aerial horizon sanity
        fliplr=0.5,
        mosaic=1.0,          # Mosaic is critical for small target feature learning
        mixup=0.1,
    )

    print("\n✅ Training Complete. Best model saved in:", results.save_dir)
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FalconEye FPV Aerial Model Training")
    parser.add_argument("--model", type=str, default="yolo11n.pt", help="Base YOLO11 model (n/s/m)")
    parser.add_argument("--data", type=str, default="VisDrone.yaml", help="Path to dataset yaml")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--imgsz", type=int, default=640, help="Input image size")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--device", type=str, default="cpu", help="CUDA device '0' or 'cpu'")
    
    args = parser.parse_args()
    train_aerial_model(
        model_size=args.model,
        data_yaml=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch_size=args.batch,
        device=args.device
    )
