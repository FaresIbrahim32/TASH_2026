FROM public.ecr.aws/lambda/python:3.12

COPY requirements.txt .
RUN pip install -r requirements.txt --no-cache-dir

COPY mobilenet_mri_dementia_3class_final.keras .
COPY handler.py .

CMD ["handler.handler"]
