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


# ---------------------------------------------------------------------------
# Command extraction
# ---------------------------------------------------------------------------

COMMANDS = [
    "зарегистрировать",
    "начать обработку",
    "отменить обработку",
    "отменить регистрацию",
    "завершить обработку",
]

# Variations that VOSK might produce (different word forms / mishearings)
COMMAND_ALIASES = {
    "зарегистрируй":       "зарегистрировать",
    "регистрация":         "зарегистрировать",
    "зарегистрируйте":     "зарегистрировать",
    "зарегистрирую":       "зарегистрировать",
    "начни обработку":     "начать обработку",
    "начните обработку":   "начать обработку",
    "начинай обработку":   "начать обработку",
    "отмени обработку":    "отменить обработку",
    "отмените обработку":  "отменить обработку",
    "отменяю обработку":   "отменить обработку",
    "отмени регистрацию":  "отменить регистрацию",
    "отмените регистрацию":"отменить регистрацию",
    "отменяю регистрацию": "отменить регистрацию",
    "заверши обработку":   "завершить обработку",
    "завершите обработку": "завершить обработку",
    "завершаю обработку":  "завершить обработку",
}

# --- Digit conversion tables ---

# Single spoken digits: "ноль" -> "0"
SPOKEN_DIGITS = {
    "ноль": "0", "нуль": "0",
    "один": "1", "одна": "1", "одно": "1", "раз": "1",
    "два": "2", "две": "2",
    "три": "3",
    "четыре": "4",
    "пять": "5",
    "шесть": "6",
    "семь": "7",
    "восемь": "8",
    "девять": "9",
}

# Teens and tens: "двенадцать" -> "12", "двадцать" -> "20"
SPOKEN_NUMBERS = {
    "десять": 10, "одиннадцать": 11, "двенадцать": 12,
    "тринадцать": 13, "четырнадцать": 14, "пятнадцать": 15,
    "шестнадцать": 16, "семнадцать": 17, "восемнадцать": 18,
    "девятнадцать": 19,
    "двадцать": 20, "тридцать": 30, "сорок": 40, "пятьдесят": 50,
    "шестьдесят": 60, "семьдесят": 70, "восемьдесят": 80, "девяносто": 90,
    "сто": 100, "двести": 200, "триста": 300, "четыреста": 400,
    "пятьсот": 500, "шестьсот": 600, "семьсот": 700, "восемьсот": 800,
    "девятьсот": 900,
}

# Russian letter names as VOSK might spell them: "эр" -> "Р"
# Includes alternative pronunciations that VOSK may produce
SPOKEN_LETTERS = {
    # Стандартные названия букв (как учат в школе)
    "а": "А", "бэ": "Б", "вэ": "В", "гэ": "Г", "дэ": "Д",
    "е": "Е", "ё": "Ё", "жэ": "Ж", "зэ": "З",
    "и": "И", "й": "Й", "ий": "Й",
    "ка": "К", "эль": "Л", "эм": "М", "эн": "Н",
    "о": "О", "пэ": "П", "эр": "Р", "эс": "С", "тэ": "Т",
    "у": "У", "эф": "Ф", "ха": "Х", "цэ": "Ц", "че": "Ч",
    "ша": "Ш", "ща": "Щ", "ы": "Ы", "э": "Э", "ю": "Ю", "я": "Я",
    
    # Альтернативные произношения (как VOSK может распознать в потоке речи)
    # Б
    "бе": "Б", "б": "Б", "быть": "Б", "бы": "Б",
    # В  
    "вэ": "В", "вы": "В", "ве": "В", "в": "В", "вот": "В", "вам": "В",
    # Г
    "ге": "Г", "г": "Г",
    # Д
    "де": "Д", "д": "Д", "дэ": "Д",
    # Ж
    "же": "Ж", "ж": "Ж",
    # З
    "зе": "З", "з": "З", "зэ": "З",
    # К
    "к": "К", "ке": "К", "ко": "К",
    # Л
    "эль": "Л", "эл": "Л", "ель": "Л", "ел": "Л", "л": "Л", "ле": "Л", "ла": "Л",
    # М
    "эм": "М", "ем": "М", "м": "М", "ме": "М", "ма": "М",
    # Н
    "эн": "Н", "ен": "Н", "н": "Н", "не": "Н", "на": "Н", "ну": "Н",
    # П
    "пе": "П", "п": "П", "па": "П",
    # Р
    "эр": "Р", "ер": "Р", "р": "Р", "ре": "Р", "ры": "Р", "ра": "Р", "ру": "Р", "ар": "Р",
    # С
    "эс": "С", "се": "С", "с": "С", "сэ": "С", "са": "С",
    # Т
    "те": "Т", "т": "Т", "та": "Т", "ту": "Т", "то": "Т",
    # Ф
    "эф": "Ф", "фэ": "Ф", "ф": "Ф", "фе": "Ф", "фа": "Ф",
    # Х
    "ха": "Х", "х": "Х", "хэ": "Х",
    # Ц
    "це": "Ц", "ц": "Ц", "цэ": "Ц",
    # Ч
    "ч": "Ч", "чэ": "Ч", "чи": "Ч",
    # Ш
    "ш": "Ш", "ше": "Ш", "ша": "Ш",
    # Щ
    "щ": "Щ", "ще": "Щ", "ща": "Щ",
    # Икс (латинская X, часто используется)
    "икс": "X", "икса": "X", "иксом": "X",
    
    # Latin letters that VOSK might output (для смешанных кодов)
    "эй": "A", "би": "B", "си": "C", "ди": "D",
    "джи": "G", "эйч": "H", "ай": "I",
    "кей": "K", "пи": "P", "кью": "Q",
    "ти": "T", "ви": "V", "дабл ю": "W",
    "экс": "X", "игрек": "Y", "зет": "Z", "зэт": "Z",
}

# Filler / noise words to strip when extracting identifiers
# НЕ включаем сюда буквы типа "и", "а", "о" - они могут быть частью идентификатора
FILLER_WORDS = {
    "номер", "номером", "нумер", "номера",
    "плавка", "плавки", "плавку", "плавкой", "плавке",
    "труба", "трубу", "трубы", "трубой", "трубе",
    "партия", "партию", "партии", "партией", "партий",
    "деталь", "детали", "деталью", "деталей",
    "изделие", "изделия", "изделием", "изделий",
    "под", "с", "на", "по", "для", "от", "до",
    "это", "этот", "эта", "эти",
}


def _words_to_digit_string(words: list[str]) -> str:
    """
    Convert a sequence of spoken Russian words into a digit/letter string.

    Handles multiple VOSK output styles:
      - Individual digits: "два один девять пять семь восемь девять восемь" -> "21957898"
      - Compound numbers: "двадцать один" -> "21"
      - Mixed: "сорок пять триста сорок пять" -> "45345"
      - Letters: "эр" -> "Р", "и" -> "И", "вэ" -> "В"
      - Already-numeric tokens: "45345" -> "45345"
    """
    result = []
    i = 0
    while i < len(words):
        w = words[i]

        # Already a digit string (VOSK sometimes outputs actual digits)
        if re.match(r'^\d+$', w):
            result.append(w)
            i += 1
            continue

        # Already an alphanumeric code (e.g. "р45345ив")
        if re.match(r'^[а-яёa-z]+\d+', w) or re.match(r'^\d+[а-яёa-z]+', w):
            result.append(w.upper())
            i += 1
            continue

        # Single spoken digit: "два" -> "2"
        if w in SPOKEN_DIGITS:
            result.append(SPOKEN_DIGITS[w])
            i += 1
            continue

        # Compound number: "двадцать" [+ "один"] -> "21"
        if w in SPOKEN_NUMBERS:
            value = SPOKEN_NUMBERS[w]
            # Look ahead for units: "двадцать один" -> 21
            if value >= 20 and value < 100 and i + 1 < len(words):
                next_w = words[i + 1]
                if next_w in SPOKEN_DIGITS:
                    value += int(SPOKEN_DIGITS[next_w])
                    i += 1
                elif next_w in SPOKEN_NUMBERS and SPOKEN_NUMBERS[next_w] < 10:
                    value += SPOKEN_NUMBERS[next_w]
                    i += 1
            # Hundreds: "пятьсот" [+ tens/units]
            if value >= 100 and i + 1 < len(words):
                next_w = words[i + 1]
                if next_w in SPOKEN_NUMBERS and SPOKEN_NUMBERS[next_w] < 100:
                    tens_val = SPOKEN_NUMBERS[next_w]
                    value += tens_val
                    i += 1
                    # "пятьсот двадцать" + "один"
                    if tens_val >= 20 and i + 1 < len(words):
                        next_w2 = words[i + 1]
                        if next_w2 in SPOKEN_DIGITS:
                            value += int(SPOKEN_DIGITS[next_w2])
                            i += 1
                elif next_w in SPOKEN_DIGITS:
                    value += int(SPOKEN_DIGITS[next_w])
                    i += 1
            result.append(str(value))
            i += 1
            continue

        # Two-word letter name: "дабл ю" -> "W"
        if i + 1 < len(words):
            two_word = w + " " + words[i + 1]
            if two_word in SPOKEN_LETTERS:
                result.append(SPOKEN_LETTERS[two_word])
                i += 2
                continue

        # Single letter name: "эр" -> "Р"
        if w in SPOKEN_LETTERS:
            result.append(SPOKEN_LETTERS[w])
            i += 1
            continue

        # Single Cyrillic letter spoken as itself (а, о, у, etc.)
        if len(w) == 1 and re.match(r'[а-яё]', w):
            result.append(w.upper())
            i += 1
            continue

        # Unknown word - skip (filler)
        i += 1

    return "".join(result)


def extract_command_and_id(text: str) -> tuple[str | None, str | None]:
    """
    Extract the command keyword and alphanumeric identifier from transcribed text.

    Examples of expected inputs (from VOSK):
      "зарегистрировать трубу номер эр сорок пять триста сорок пять и вэ"
        -> ("зарегистрировать", "Р45345ИВ")
      "отменить обработку плавки два один девять пять семь восемь девять восемь"
        -> ("отменить обработку", "21957898")
      "начать обработку партии двенадцать тридцать четыре пятьдесят шесть семьдесят восемь"
        -> ("начать обработку", "12345678")
    """
    normalized = text.lower().strip()

    # --- Detect command ---
    detected_command = None
    command_end_pos = 0

    # Try exact commands first (longest match)
    for cmd in sorted(COMMANDS, key=len, reverse=True):
        pos = normalized.find(cmd)
        if pos != -1:
            detected_command = cmd
            command_end_pos = pos + len(cmd)
            break

    # Try aliases if no exact match
    if not detected_command:
        for alias, canonical in sorted(COMMAND_ALIASES.items(), key=lambda x: len(x[0]), reverse=True):
            pos = normalized.find(alias)
            if pos != -1:
                detected_command = canonical
                command_end_pos = pos + len(alias)
                break

    # --- Extract identifier from text after command ---
    after_command = normalized[command_end_pos:] if detected_command else normalized

    # Remove filler words
    words = after_command.split()
    clean_words = [w for w in words if w not in FILLER_WORDS]

    # Convert spoken words to digit/letter string
    identifier = _words_to_digit_string(clean_words)

    # Validate: identifier should contain at least one digit
    if identifier and re.search(r'\d', identifier):
        # Clean up: identifier should be the meaningful part
        pass
    else:
        identifier = None

    # Fallback: look for already-formed alphanumeric patterns in original text
    if not identifier:
        # 8-digit sequence
        match = re.search(r'\b\d{8}\b', normalized)
        if match:
            identifier = match.group()

        # Alphanumeric: letter(s)+digits or digits+letter(s)
        if not identifier:
            patterns = [
                r'[а-яёa-z]\d{2,}[а-яёa-z]+',   # Р45345ИВ
                r'\d{2,}[а-яёa-z]+',              # 45345ИВ
                r'[а-яёa-z]+\d{2,}',              # ИВ45345
            ]
            for pat in patterns:
                match = re.search(pat, normalized)
                if match:
                    identifier = match.group().upper()
                    break

    return detected_command, identifier
