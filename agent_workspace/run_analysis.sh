# Create necessary directories
mkdir -p /workspace/charts
mkdir -p /workspace/data

# Install required packages and run analysis
cd /workspace && python code/webllm_model_analysis.py
