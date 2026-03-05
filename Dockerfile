FROM kubeflownotebookswg/jupyter-scipy:v1.8.0

USER root

RUN pip install jupyterlab

USER jovyan

WORKDIR /home/jovyan

COPY kernel-allocation-notification /tmp/ext

RUN cd /tmp/ext \
    && jlpm install \
    && jlpm build \
    && jupyter labextension install .
