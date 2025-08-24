"""
WebLLM-Compatible Models Analysis for Sentiment Analysis in Journaling Apps
Comprehensive analysis and visualization of model performance, memory requirements, and capabilities
"""

import warnings
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np
import json
from pathlib import Path

def setup_matplotlib_for_plotting():
    """
    Setup matplotlib and seaborn for plotting with proper configuration.
    Call this function before creating any plots to ensure proper rendering.
    """
    warnings.filterwarnings('default')  # Show all warnings

    # Configure matplotlib for non-interactive mode
    plt.switch_backend("Agg")

    # Set chart style
    plt.style.use("seaborn-v0_8")
    sns.set_palette("husl")

    # Configure platform-appropriate fonts for cross-platform compatibility
    plt.rcParams["font.sans-serif"] = ["Noto Sans CJK SC", "WenQuanYi Zen Hei", "PingFang SC", "Arial Unicode MS", "Hiragino Sans GB"]
    plt.rcParams["axes.unicode_minus"] = False

# Setup matplotlib
setup_matplotlib_for_plotting()

def create_webllm_compatibility_data():
    """Create comprehensive model compatibility and performance data"""
    
    # WebLLM supported models with memory requirements
    webllm_models = {
        'Llama-3.2-1B-Instruct-q4f16_1': {
            'vram_mb': 879.04,
            'parameters': '1.23B',
            'low_resource_compatible': True,
            'context_window': 4096,
            'quantization': 'q4f16_1',
            'sentiment_f1_score': None,  # Not directly tested
            'instruction_following': 59.5,  # IFEval from Llama data
            'file_size_gb': 0.88
        },
        'Llama-3.2-1B-Instruct-q4f32_1': {
            'vram_mb': 1128.82,
            'parameters': '1.23B',
            'low_resource_compatible': True,
            'context_window': 4096,
            'quantization': 'q4f32_1',
            'sentiment_f1_score': None,
            'instruction_following': 59.5,
            'file_size_gb': 1.13
        },
        'Llama-3.2-3B-Instruct-q4f16_1': {
            'vram_mb': 2263.69,
            'parameters': '3.21B',
            'low_resource_compatible': True,
            'context_window': 4096,
            'quantization': 'q4f16_1',
            'sentiment_f1_score': None,
            'instruction_following': 59.5,  # Estimated similar to 1B
            'file_size_gb': 2.26
        },
        'SmolLM2-135M-Instruct-q0f32': {
            'vram_mb': 719.38,
            'parameters': '135M',
            'low_resource_compatible': True,
            'context_window': 4096,
            'quantization': 'q0f32',
            'sentiment_f1_score': None,  # Not tested in benchmarks
            'instruction_following': None,
            'file_size_gb': 0.72
        },
        'SmolLM2-360M-Instruct-q4f32_1': {
            'vram_mb': 579.61,
            'parameters': '360M',
            'low_resource_compatible': True,
            'context_window': 4096,
            'quantization': 'q4f32_1',
            'sentiment_f1_score': None,
            'instruction_following': None,
            'file_size_gb': 0.58
        },
        'SmolLM2-1.7B-Instruct-q4f32_1': {
            'vram_mb': 2692.38,
            'parameters': '1.7B',
            'low_resource_compatible': True,
            'context_window': 4096,
            'quantization': 'q4f32_1',
            'sentiment_f1_score': None,
            'instruction_following': None,
            'file_size_gb': 2.69
        },
        'Phi-3.5-mini-instruct-q4f16_1': {
            'vram_mb': 3672.07,
            'parameters': '3.8B',
            'low_resource_compatible': False,
            'context_window': 4096,
            'quantization': 'q4f16_1',
            'sentiment_f1_score': None,
            'instruction_following': 61.4,  # Overall average from benchmarks
            'file_size_gb': 3.67
        },
        'Phi-3.5-mini-instruct-q4f16_1-1k': {
            'vram_mb': 2520.07,
            'parameters': '3.8B',
            'low_resource_compatible': True,
            'context_window': 1024,
            'quantization': 'q4f16_1',
            'sentiment_f1_score': None,
            'instruction_following': 61.4,
            'file_size_gb': 2.52
        },
        'Qwen2.5-0.5B-Instruct-q4f32_1': {
            'vram_mb': 1060.20,
            'parameters': '0.5B',
            'low_resource_compatible': True,
            'context_window': 4096,
            'quantization': 'q4f32_1',
            'sentiment_f1_score': None,
            'instruction_following': None,
            'file_size_gb': 1.06
        },
        'Qwen2.5-1.5B-Instruct-q4f32_1': {
            'vram_mb': 1888.97,
            'parameters': '1.5B',
            'low_resource_compatible': True,
            'context_window': 4096,
            'quantization': 'q4f32_1',
            'sentiment_f1_score': 58.29,  # From SentiBench benchmark
            'instruction_following': None,
            'file_size_gb': 1.89
        },
        'Qwen2.5-3B-Instruct-q4f32_1': {
            'vram_mb': 2893.64,
            'parameters': '3B',
            'low_resource_compatible': True,
            'context_window': 4096,
            'quantization': 'q4f32_1',
            'sentiment_f1_score': None,
            'instruction_following': None,
            'file_size_gb': 2.89
        },
        'gemma-2-2b-it-q4f32_1': {
            'vram_mb': 2508.75,
            'parameters': '2.6B',
            'low_resource_compatible': False,
            'context_window': 4096,
            'quantization': 'q4f32_1',
            'sentiment_f1_score': 62.62,  # From SentiBench benchmark
            'instruction_following': None,
            'file_size_gb': 2.51
        },
        'gemma-2-2b-it-q4f32_1-1k': {
            'vram_mb': 1884.75,
            'parameters': '2.6B',
            'low_resource_compatible': True,
            'context_window': 1024,
            'quantization': 'q4f32_1',
            'sentiment_f1_score': 62.62,
            'instruction_following': None,
            'file_size_gb': 1.88
        },
        'TinyLlama-1.1B-Chat-v1.0-q4f32_1': {
            'vram_mb': 839.98,
            'parameters': '1.1B',
            'low_resource_compatible': True,
            'context_window': 2048,
            'quantization': 'q4f32_1',
            'sentiment_f1_score': 45.18,  # From SentiBench benchmark
            'instruction_following': None,
            'file_size_gb': 0.84
        }
    }
    
    # Additional sentiment analysis performance data from research
    sentiment_performance = {
        'TinyLlama-1.1B': {
            'avg_f1': 45.18,
            'emotional_intelligence_rating': 8.0,  # From comparison study
            'text_summarization_rating': 8.0,
            'strengths': ['Small size', 'Fast inference'],
            'weaknesses': ['Lower accuracy', 'Limited context understanding']
        },
        'Qwen2.5-1.5B': {
            'avg_f1': 58.29,
            'emotional_intelligence_rating': 9.0,
            'text_summarization_rating': 0.0,  # Failed due to context length
            'strengths': ['Good accuracy', 'Structured output', 'Multilingual'],
            'weaknesses': ['Context limitations in some variants']
        },
        'Gemma-2-2.6B': {
            'avg_f1': 62.62,
            'emotional_intelligence_rating': None,
            'text_summarization_rating': None,
            'strengths': ['High accuracy', 'Good reasoning'],
            'weaknesses': ['Larger size', 'More memory required']
        },
        'Phi-2-2.7B': {
            'avg_f1': 52.13,
            'emotional_intelligence_rating': None,
            'text_summarization_rating': None,
            'strengths': ['Good coding abilities', 'Reasoning'],
            'weaknesses': ['Medium accuracy on sentiment']
        }
    }
    
    return webllm_models, sentiment_performance

def create_memory_vs_performance_chart():
    """Create scatter plot showing memory requirements vs sentiment performance"""
    webllm_models, sentiment_perf = create_webllm_compatibility_data()
    
    # Prepare data for plotting
    models = []
    memory_mb = []
    sentiment_scores = []
    sizes = []
    colors = []
    
    for model_name, data in webllm_models.items():
        if data['sentiment_f1_score'] is not None:
            models.append(model_name.split('-')[0] + '\n' + data['parameters'])
            memory_mb.append(data['vram_mb'])
            sentiment_scores.append(data['sentiment_f1_score'])
            
            # Size based on parameters (for bubble chart effect)
            param_val = float(data['parameters'].replace('B', '').replace('M', ''))
            if 'M' in data['parameters']:
                param_val = param_val / 1000  # Convert to B
            sizes.append(param_val * 100)
            
            # Color based on low resource compatibility
            colors.append('green' if data['low_resource_compatible'] else 'red')
    
    plt.figure(figsize=(12, 8))
    scatter = plt.scatter(memory_mb, sentiment_scores, s=sizes, c=colors, alpha=0.6, edgecolors='black')
    
    # Add model labels
    for i, model in enumerate(models):
        plt.annotate(model, (memory_mb[i], sentiment_scores[i]), 
                    xytext=(5, 5), textcoords='offset points', fontsize=9)
    
    plt.xlabel('VRAM Requirements (MB)', fontsize=12)
    plt.ylabel('Sentiment Analysis F1-Score (%)', fontsize=12)
    plt.title('WebLLM Models: Memory vs Sentiment Analysis Performance\n(Bubble size = Model parameters, Green = Low-resource compatible)', fontsize=14)
    plt.grid(True, alpha=0.3)
    
    # Add 4GB memory constraint line
    plt.axvline(x=4000, color='orange', linestyle='--', linewidth=2, label='4GB Memory Limit')
    plt.legend(['Low-resource Compatible', 'High-resource Required', '4GB Memory Limit'])
    
    plt.tight_layout()
    plt.savefig('/workspace/charts/memory_vs_sentiment_performance.png', dpi=300, bbox_inches='tight')
    plt.close()

def create_model_comparison_matrix():
    """Create comprehensive comparison matrix of all models"""
    webllm_models, sentiment_perf = create_webllm_compatibility_data()
    
    # Create comparison data
    comparison_data = []
    
    for model_name, data in webllm_models.items():
        base_name = model_name.split('-Instruct')[0].split('-q4')[0]
        
        comparison_data.append({
            'Model': base_name,
            'Parameters': data['parameters'],
            'VRAM (MB)': data['vram_mb'],
            'File Size (GB)': data['file_size_gb'],
            'Context Length': data['context_window'],
            'Quantization': data['quantization'],
            'Low Resource': 'Yes' if data['low_resource_compatible'] else 'No',
            'Sentiment F1': data['sentiment_f1_score'] if data['sentiment_f1_score'] else 'N/A',
            'Instruction Following': data['instruction_following'] if data['instruction_following'] else 'N/A',
            'Under 4GB': 'Yes' if data['file_size_gb'] < 4.0 else 'No'
        })
    
    df = pd.DataFrame(comparison_data)
    
    # Create heatmap for numeric columns
    numeric_cols = ['VRAM (MB)', 'File Size (GB)', 'Context Length']
    sentiment_cols = []
    
    # Add sentiment scores where available
    for idx, row in df.iterrows():
        if row['Sentiment F1'] != 'N/A':
            sentiment_cols.append(float(row['Sentiment F1']))
        else:
            sentiment_cols.append(np.nan)
    
    df['Sentiment Score'] = sentiment_cols
    
    # Create visualization
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(20, 10))
    
    # Heatmap of numeric performance metrics
    heatmap_data = df[['VRAM (MB)', 'File Size (GB)', 'Sentiment Score']].copy()
    heatmap_data.index = df['Model']
    
    # Normalize data for heatmap (0-1 scale)
    heatmap_normalized = heatmap_data.copy()
    for col in heatmap_normalized.columns:
        col_data = heatmap_normalized[col].dropna()
        if len(col_data) > 0:
            min_val, max_val = col_data.min(), col_data.max()
            if max_val > min_val:
                heatmap_normalized[col] = (heatmap_normalized[col] - min_val) / (max_val - min_val)
    
    sns.heatmap(heatmap_normalized, annot=heatmap_data, fmt='.1f', cmap='RdYlGn_r', 
                ax=ax1, cbar_kws={'label': 'Normalized Score (0-1)'})
    ax1.set_title('Model Performance Heatmap\n(Lower is better for VRAM/Size, Higher for Sentiment)', fontsize=14)
    ax1.tick_params(axis='x', rotation=45)
    
    # Bar chart of sentiment performance
    sentiment_data = df[df['Sentiment Score'].notna()].copy()
    sentiment_data = sentiment_data.sort_values('Sentiment Score', ascending=False)
    
    bars = ax2.bar(range(len(sentiment_data)), sentiment_data['Sentiment Score'], 
                   color=['green' if x == 'Yes' else 'red' for x in sentiment_data['Low Resource']])
    ax2.set_xlabel('Models', fontsize=12)
    ax2.set_ylabel('Sentiment Analysis F1-Score (%)', fontsize=12)
    ax2.set_title('Sentiment Analysis Performance by Model\n(Green = Low-resource compatible)', fontsize=14)
    ax2.set_xticks(range(len(sentiment_data)))
    ax2.set_xticklabels(sentiment_data['Model'], rotation=45, ha='right')
    
    # Add value labels on bars
    for i, bar in enumerate(bars):
        height = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width()/2., height + 0.5,
                f'{height:.1f}', ha='center', va='bottom')
    
    plt.tight_layout()
    plt.savefig('/workspace/charts/model_comparison_matrix.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    return df

def create_deployment_feasibility_chart():
    """Create chart showing deployment feasibility based on constraints"""
    webllm_models, _ = create_webllm_compatibility_data()
    
    # Categorize models by deployment feasibility
    categories = {
        'Excellent for Journaling': [],
        'Good for Journaling': [],
        'Adequate for Journaling': [],
        'Not Suitable': []
    }
    
    for model_name, data in webllm_models.items():
        # Scoring criteria:
        # - File size under 4GB
        # - Low resource compatible
        # - Good sentiment performance (if available)
        # - Adequate context length
        
        score = 0
        
        if data['file_size_gb'] < 4.0:
            score += 2
        elif data['file_size_gb'] < 6.0:
            score += 1
            
        if data['low_resource_compatible']:
            score += 2
            
        if data['sentiment_f1_score'] and data['sentiment_f1_score'] > 60:
            score += 3
        elif data['sentiment_f1_score'] and data['sentiment_f1_score'] > 50:
            score += 2
        elif data['sentiment_f1_score'] and data['sentiment_f1_score'] > 40:
            score += 1
            
        if data['context_window'] >= 4096:
            score += 1
            
        # Categorize based on score
        base_name = model_name.split('-Instruct')[0]
        
        if score >= 7:
            categories['Excellent for Journaling'].append(base_name)
        elif score >= 5:
            categories['Good for Journaling'].append(base_name)
        elif score >= 3:
            categories['Adequate for Journaling'].append(base_name)
        else:
            categories['Not Suitable'].append(base_name)
    
    # Create visualization
    fig, ax = plt.subplots(figsize=(14, 8))
    
    y_pos = 0
    colors = ['darkgreen', 'green', 'orange', 'red']
    
    for i, (category, models) in enumerate(categories.items()):
        if models:
            ax.barh(y_pos, len(models), color=colors[i], alpha=0.7, label=category)
            
            # Add model names
            for j, model in enumerate(models):
                ax.text(j + 0.5, y_pos, model, ha='center', va='center', 
                       fontsize=9, rotation=0, fontweight='bold')
            
            y_pos += 1
    
    ax.set_ylabel('Suitability Category', fontsize=12)
    ax.set_xlabel('Number of Models', fontsize=12)
    ax.set_title('WebLLM Model Deployment Feasibility for Journaling Apps\n(Based on size, compatibility, performance, and context length)', fontsize=14)
    ax.set_yticks(range(len(categories)))
    ax.set_yticklabels(categories.keys())
    ax.legend(loc='upper right')
    
    plt.tight_layout()
    plt.savefig('/workspace/charts/deployment_feasibility.png', dpi=300, bbox_inches='tight')
    plt.close()

def generate_analysis_summary():
    """Generate text summary of analysis findings"""
    webllm_models, sentiment_perf = create_webllm_compatibility_data()
    
    # Key findings
    findings = {
        'total_models_analyzed': len(webllm_models),
        'models_with_sentiment_data': len([m for m in webllm_models.values() if m['sentiment_f1_score']]),
        'models_under_4gb': len([m for m in webllm_models.values() if m['file_size_gb'] < 4.0]),
        'low_resource_compatible': len([m for m in webllm_models.values() if m['low_resource_compatible']]),
        'best_sentiment_model': max(
            [(name, data['sentiment_f1_score']) for name, data in webllm_models.items() if data['sentiment_f1_score']], 
            key=lambda x: x[1]
        ),
        'smallest_model': min(
            [(name, data['file_size_gb']) for name, data in webllm_models.items()], 
            key=lambda x: x[1]
        )
    }
    
    summary = f"""
WEBLLM MODEL ANALYSIS SUMMARY
============================

Total Models Analyzed: {findings['total_models_analyzed']}
Models with Sentiment Benchmarks: {findings['models_with_sentiment_data']}
Models Under 4GB: {findings['models_under_4gb']}
Low-Resource Compatible Models: {findings['low_resource_compatible']}

Best Sentiment Performance: {findings['best_sentiment_model'][0]} ({findings['best_sentiment_model'][1]:.1f}% F1)
Smallest Model: {findings['smallest_model'][0]} ({findings['smallest_model'][1]:.2f}GB)

Key Insights:
- Gemma-2-2B shows the best sentiment analysis performance (62.62% F1)
- TinyLlama is the most compact but has lower accuracy (45.18% F1)
- Qwen2.5-1.5B offers good balance of size (1.89GB) and performance (58.29% F1)
- All Llama 3.2 models lack sentiment-specific benchmarks but show strong instruction following
- SmolLM models are extremely compact but lack sentiment benchmarks
"""
    
    return summary, findings

def main():
    """Run complete analysis pipeline"""
    print("Setting up analysis environment...")
    
    # Create charts directory
    Path('/workspace/charts').mkdir(exist_ok=True)
    
    print("Creating visualizations...")
    
    # Generate all charts
    create_memory_vs_performance_chart()
    print("✓ Memory vs Performance chart created")
    
    comparison_df = create_model_comparison_matrix()
    print("✓ Model comparison matrix created")
    
    create_deployment_feasibility_chart()
    print("✓ Deployment feasibility chart created")
    
    # Generate summary
    summary, findings = generate_analysis_summary()
    print("✓ Analysis summary generated")
    
    # Save comparison matrix as CSV
    comparison_df.to_csv('/workspace/data/model_comparison_matrix.csv', index=False)
    print("✓ Comparison matrix saved to CSV")
    
    # Save analysis summary
    with open('/workspace/data/analysis_summary.txt', 'w') as f:
        f.write(summary)
    
    # Save findings as JSON
    with open('/workspace/data/analysis_findings.json', 'w') as f:
        json.dump(findings, f, indent=2)
    
    print("\nAnalysis complete! Generated files:")
    print("- /workspace/charts/memory_vs_sentiment_performance.png")
    print("- /workspace/charts/model_comparison_matrix.png") 
    print("- /workspace/charts/deployment_feasibility.png")
    print("- /workspace/data/model_comparison_matrix.csv")
    print("- /workspace/data/analysis_summary.txt")
    print("- /workspace/data/analysis_findings.json")
    
    return summary, comparison_df

if __name__ == "__main__":
    summary, df = main()
    print(summary)
