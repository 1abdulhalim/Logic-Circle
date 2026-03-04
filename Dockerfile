FROM python:3.10-slim

WORKDIR /app

COPY game/ ./game/

EXPOSE 8501

CMD ["python", "-m", "http.server", "8501", "--directory", "game"]
