"""ClearTake's local sound-event detector. Fresh implementation; see ../LICENSE.

YAMNet scores are model outputs, not probabilities of a correct edit.
This program reports intervals and never modifies its input audio.
"""
import argparse
import csv
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

EVENT_NAMES = {"Sneeze", "Cough", "Throat clearing", "Sniff"}
VOICE_NAMES = {"Speech", "Child speech, kid speaking", "Conversation", "Narration, monologue", "Singing"}


def select_events(frames, names, duration):
    targets = [i for i, name in enumerate(names) if name in EVENT_NAMES]
    voices = [i for i, name in enumerate(names) if name in VOICE_NAMES]
    if not targets or not voices:
        raise ValueError("The model's class list does not match YAMNet.")
    found = []
    for frame_number, values in enumerate(frames):
        label = max(targets, key=lambda index: values[index])
        strength = float(values[label])
        if strength < .22:
            continue
        voice = max(float(frames[near][index]) for near in range(max(0, frame_number-1), min(len(frames), frame_number+2)) for index in voices)
        beginning = max(0, frame_number*.48-.06)
        ending = min(duration, frame_number*.48+.96+.06)
        if ending <= beginning:
            continue
        event = {"start": round(beginning, 3), "end": round(ending, 3), "label": names[label],
                 "score": round(strength, 3), "voiceNearby": voice >= .2,
                 "suggested": strength >= .65 and voice < .2}
        if found and beginning <= found[-1]["end"]:
            previous = found[-1]
            previous["end"] = event["end"]
            previous["voiceNearby"] |= event["voiceNearby"]
            previous["suggested"] &= event["suggested"]
            if strength > previous["score"]:
                previous["score"], previous["label"] = event["score"], event["label"]
        else:
            found.append(event)
    return found


def install(destination):
    import tensorflow_hub as hub
    destination = Path(destination).resolve()
    if (destination/"saved_model.pb").is_file():
        print("Local model is already installed.")
        return
    cached = hub.resolve("https://tfhub.dev/google/yamnet/1")
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(destination.name+"-download")
    if temporary.exists():
        shutil.rmtree(temporary)
    shutil.copytree(cached, temporary)
    hub.load(str(temporary))
    temporary.rename(destination)
    print("Local sound model is ready.")


def scan(audio_path, model_path, ffmpeg):
    import numpy as np
    import tensorflow_hub as hub
    model_path = Path(model_path).resolve()
    if not (model_path/"saved_model.pb").is_file():
        raise RuntimeError("Sound model is missing. Rebuild with the bundled model.")
    # Stop at 60 minutes to bound inference memory and processing time.
    decoded = subprocess.run([ffmpeg, "-v", "error", "-nostdin", "-i", audio_path,
                              "-t", "3600", "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "pipe:1"],
                             check=True, capture_output=True, timeout=600)
    waveform = np.frombuffer(decoded.stdout, dtype="<f4")
    if not len(waveform):
        raise ValueError("No readable audio was found.")
    model = hub.load(str(model_path))
    with open(model.class_map_path().numpy().decode(), newline="") as classes:
        names = [row["display_name"] for row in csv.DictReader(classes)]
    scores = []
    hop = 7680
    for base in range(0, len(waveform), hop*48):
        chunk = waveform[base:base+hop*49]
        if len(chunk) < 15600:
            chunk = np.pad(chunk, (0,15600-len(chunk)))
        predicted, _, _ = model(chunk)
        count = min(48, int(np.ceil((len(waveform)-base)/hop)))
        scores.extend(predicted.numpy()[:count].tolist())
    return {"events": select_events(scores, names, len(waveform)/16000),
            "analyzedSeconds": len(waveform)/16000, "limitSeconds":3600, "model":"Google YAMNet"}


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    setup = sub.add_parser("setup")
    setup.add_argument("--model", required=True)
    detect = sub.add_parser("scan")
    detect.add_argument("--model", required=True)
    detect.add_argument("--audio", required=True)
    detect.add_argument("--ffmpeg", required=True)
    args = parser.parse_args()
    if args.command == "setup":
        install(args.model)
    else:
        print(json.dumps(scan(args.audio,args.model,args.ffmpeg)))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error),file=sys.stderr)
        sys.exit(1)
