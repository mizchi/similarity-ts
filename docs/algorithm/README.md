# Algorithm Documentation

This directory contains documentation about the algorithms used in the similarity detection tools.

## Contents

- [TSED (Tree Similarity of Edit Distance)](tsed-similarity.md) - Complete academic paper on the TSED algorithm
- [TSED Summary](tsed-similarity-summary.md) - Summary of the TSED paper
- [Tree-sitter Integration Analysis](tree-sitter-integration-analysis.md) - Analysis of tree-sitter integration for AST parsing

## Overview

The similarity detection tools use AST-based comparison algorithms to detect code duplication across multiple programming languages. The core algorithm is TSED (Tree Similarity of Edit Distance), which provides accurate structural comparison of code while considering both structure and size differences.