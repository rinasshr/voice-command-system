import json
import os
import re
import wave
import subprocess
from vosk import Model, KaldiRecognizer

MODEL_PATH = os.environ.get("VOSK_MODEL_PATH", "model")

_model = None


def get_model() -> Model:
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise RuntimeError(
                f"VOSK model not found at '{MODEL_PATH}'. "
                "Download a Russian model from https://alphacephei.com/vosk/models "
                "and extract it to the 'model' directory."
            )
        _model = Model(MODEL_PATH)
    return _model


def convert_to_wav(input_path: str) -> str:
    """Convert any audio file to 16kHz mono WAV using ffmpeg."""
    wav_path = input_path.rsplit(".", 1)[0] + "_converted.wav"
    subprocess.run(
        ["ffmpeg", "-y", "-i", input_path, "-ar", "16000", "-ac", "1", "-f", "wav", wav_path],
        capture_output=True,
        check=True,
    )
    return wav_path


def transcribe(audio_path: str) -> tuple[str, float]:
    """Transcribe audio file and return (text, duration_seconds)."""
    wav_path = convert_to_wav(audio_path)

    wf = wave.open(wav_path, "rb")
    duration = wf.getnframes() / wf.getframerate()

    rec = KaldiRecognizer(get_model(), wf.getframerate())
    rec.SetWords(True)

    results = []
    while True:
        data = wf.readframes(4000)
        if len(data) == 0:
            break
        if rec.AcceptWaveform(data):
            part = json.loads(rec.Result())
            if part.get("text"):
                results.append(part["text"])

    final = json.loads(rec.FinalResult())
    if final.get("text"):
        results.append(final["text"])

    wf.close()
    if wav_path != audio_path:
        os.remove(wav_path)

    return " ".join(results).strip(), round(duration, 1)


# --- Command extraction ---

COMMANDS = [
    "зарегистрировать",
    "начать обработку",
    "отменить обработку",
    "отменить регистрацию",
    "завершить обработку",
]

# Map for Russian spoken digits to actual digits
SPOKEN_DIGITS = {
    "ноль": "0", "один": "1", "одна": "1", "два": "2", "две": "2",
    "три": "3", "четыре": "4", "пять": "5", "шесть": "6",
    "семь": "7", "восемь": "8", "девять": "9",
}


def _normalize_digits(text: str) -> str:
    """Replace spoken digit words with numeric characters."""
    words = text.split()
    result = []
    for w in words:
        if w in SPOKEN_DIGITS:
            result.append(SPOKEN_DIGITS[w])
        else:
            result.append(w)
    return " ".join(result)


def extract_command_and_id(text: str) -> tuple[str | None, str | None]:
    """Extract command keyword and identifier from transcribed text."""
    normalized = text.lower().strip()
    normalized = _normalize_digits(normalized)

    detected_command = None
    for cmd in sorted(COMMANDS, key=len, reverse=True):
        if cmd in normalized:
            detected_command = cmd
            break

    # Extract alphanumeric identifier (letters + digits mix, or 8-digit sequence)
    identifier = None
    # Look for alphanumeric codes like Р45345ИВ (cyrillic+digits)
    id_patterns = [
        r'[а-яА-ЯёЁa-zA-Z]\d+[а-яА-ЯёЁa-zA-Z]+',  # letter-digits-letters
        r'\d+[а-яА-ЯёЁa-zA-Z]+\d*',                   # digits-letters
        r'[а-яА-ЯёЁa-zA-Z]+\d+',                       # letters-digits
        r'\b\d{8}\b',                                    # 8-digit sequence
    ]

    # First try to find identifiers in the text after the command
    search_text = normalized
    if detected_command:
        cmd_pos = normalized.find(detected_command)
        search_text = normalized[cmd_pos + len(detected_command):]

    # Remove common filler words
    fillers = ["номер", "плавки", "плавку", "трубу", "трубы", "партию", "партии"]
    clean_text = search_text
    for f in fillers:
        clean_text = clean_text.replace(f, " ")

    # Try to reconstruct identifier from remaining tokens
    tokens = clean_text.split()
    digit_letter_sequence = []
    for token in tokens:
        # Skip pure filler words
        if token in fillers:
            continue
        # Check if token is a digit or letter that could be part of an ID
        if re.match(r'^[а-яА-ЯёЁa-zA-Z0-9]+$', token) and len(token) <= 20:
            digit_letter_sequence.append(token)

    if digit_letter_sequence:
        combined = "".join(digit_letter_sequence)
        # Check if it looks like an identifier (has digits)
        if re.search(r'\d', combined):
            identifier = combined.upper()

    # Fallback: direct pattern match on original text
    if not identifier:
        for pattern in id_patterns:
            match = re.search(pattern, search_text)
            if match:
                identifier = match.group().upper()
                break

    return detected_command, identifier
