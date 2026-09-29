---
language:
- en
tags:
- chess
- maia
- maia3
- chessformer
- move-prediction
- human-ai
- interpretability
---

# Maia3-79M

Part of the [**Maia3**](https://huggingface.co/collections/UofTCSSLab/maia3) family of transformer models for human chess move prediction. This is the **79M-parameter variant**.

For full details (architecture details, training recipe, full evaluation, and ablations) see our paper [*Chessformer: A Unified Architecture for Chess Modeling*](https://openreview.net/forum?id=2ltBRzEHyd) (ICLR 2026).

## Model summary

- **Family:** Maia-3, human move prediction models built on the **Chessformer** architecture
- **Architecture:** encoder-only transformer with board squares as tokens, augmented by **Geometric Attention Bias (GAB)**, a dynamic positional encoding that adapts to the geometry of chess, and an attention-based source-destination policy head
- **Parameters:** 79M
- **Task:** predicting the move a human player of a given skill level would make from a given position
- **Training data:** Lichess human games, January 2023 – July 2025
- **License:** AGPLv3

## Intended use

Maia-3 models predict human chess moves conditioned on player rating. Typical uses include:

- Research on human chess modeling and human–AI alignment
- Tools for chess education and entertainment
- Move-suggestion and analysis tools that emulate play at a chosen rating
- Mechanistic interpretability research: the square-token design makes attention patterns and activations directly attributable to board squares

Not intended for maximum playing strength. For strong engine play built on the same architecture, see the Chessformer integration into Leela Chess Zero described in the paper.

## How to use

Maia3-79M is a PyTorch checkpoint trained with the code at [CSSLab/maia3](https://github.com/CSSLab/maia3). Clone that repo, set up the conda environment, and load the checkpoint following the instructions in its README.

Architecture hyperparameters for this variant are defined in `ablate_size.sh` in the training repo.

## Training

- **Data:** Lichess monthly game dumps, January 2023 – July 2025
- **Code:** [CSSLab/maia3](https://github.com/CSSLab/maia3)
- **Config:** size ablation row corresponding to 79M parameters in `ablate_size.sh`

## Evaluation

The Maia-3 family reaches **57.1% move-matching accuracy** on human moves, significantly surpassing the previous state of the art with fewer than a quarter of the parameters. Per-size accuracy curves, scaling analysis, and skill-conditioned breakdowns are reported in the paper.

## Citation

```bibtex
@inproceedings{monroe2026chessformer,
  title={Chessformer: A Unified Architecture for Chess Modeling},
  author={Daniel Monroe and George Eilender and Philip Chalmers and Zhenwei Tang and Ashton Anderson},
  booktitle={The Fourteenth International Conference on Learning Representations},
  year={2026},
  url={https://openreview.net/forum?id=2ltBRzEHyd}
}
```