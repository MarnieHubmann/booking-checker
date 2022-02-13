FROM python:3.8

COPY requirements.txt .

RUN pip install --upgrade pip

RUN pip install -r requirements.txt

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
CMD /entrypoint.sh