FROM public.ecr.aws/lambda/python:3.12

COPY requirements.txt .
RUN pip install -r requirements.txt --no-cache-dir

COPY mri_dementia_cnn2.keras .
COPY handler.py .

CMD ["handler.handler"]
