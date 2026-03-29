FROM python:3.11-slim

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download VOSK Russian model
RUN python -c "import urllib.request, zipfile, os; \
    url='https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip'; \
    urllib.request.urlretrieve(url, 'model.zip'); \
    zipfile.ZipFile('model.zip').extractall('.'); \
    os.rename('vosk-model-small-ru-0.22', 'model'); \
    os.remove('model.zip')"

COPY . .
RUN mkdir -p uploads

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
