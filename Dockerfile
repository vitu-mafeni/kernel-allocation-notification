FROM ghcr.io/kubeflow/kubeflow/notebook-servers/jupyter-scipy:v1.10.0

USER root

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Copy extension with correct ownership
COPY --chown=jovyan:users . /opt/my-extension

WORKDIR /opt/my-extension

USER jovyan

# install dependencies and build extension
RUN jlpm install
RUN jlpm build

# install python package
RUN pip install -e .

RUN npm run build
RUN jupyter labextension develop . --overwrite