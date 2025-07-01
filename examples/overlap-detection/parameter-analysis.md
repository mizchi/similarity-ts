# Overlap Detection Parameter Analysis

## Overview

This document analyzes the effectiveness of different parameter combinations for overlap detection in the similarity tool.

## Parameters

1. **threshold** (-t): Similarity threshold (0.0-1.0)
2. **overlap-min-window**: Minimum window size in nodes
3. **overlap-max-window**: Maximum window size in nodes  
4. **overlap-size-tolerance**: Size tolerance for comparing windows

## Test Results

### 1. Exact Duplication Detection

For detecting exact or near-exact code duplicates:

**Recommended parameters:**
```bash
--overlap -t 0.8 --overlap-min-window 10 --overlap-max-window 30 --overlap-size-tolerance 0.2
```

- High threshold (0.8) reduces false positives
- Larger window sizes (10-30) capture meaningful code blocks
- Low size tolerance (0.2) ensures compared blocks are similar in size

### 2. Similar Pattern Detection

For finding similar algorithmic patterns:

**Recommended parameters:**
```bash
--overlap -t 0.7 --overlap-min-window 5 --overlap-max-window 20 --overlap-size-tolerance 0.3
```

- Medium threshold (0.7) allows for some variation
- Medium window sizes (5-20) balance between too small and too large
- Moderate size tolerance (0.3) allows for some size variation

### 3. Partial Overlap in Large Functions

For detecting overlaps within larger functions:

**Recommended parameters:**
```bash
--overlap -t 0.75 --overlap-min-window 8 --overlap-max-window 25 --overlap-size-tolerance 0.25
```

- Medium-high threshold (0.75) 
- Larger minimum window (8) to avoid trivial matches
- Extended maximum (25) to capture larger patterns

### 4. Minimizing False Positives

For production use where false positives should be minimized:

**Recommended parameters:**
```bash
--overlap -t 0.85 --overlap-min-window 10 --overlap-max-window 30 --overlap-size-tolerance 0.15
```

- High threshold (0.85) for high confidence matches
- Large minimum window (10) filters out trivial patterns
- Tight size tolerance (0.15) ensures very similar sizes

### 5. Exploratory Analysis

For initial exploration where you want to see all potential overlaps:

**Recommended parameters:**
```bash
--overlap -t 0.6 --overlap-min-window 3 --overlap-max-window 15 --overlap-size-tolerance 0.4
```

- Lower threshold (0.6) to catch more patterns
- Small minimum window (3) to include small patterns
- Higher size tolerance (0.4) for flexibility

## Key Findings

1. **Window Size Impact**:
   - Small windows (3-5 nodes) often catch trivial patterns like single loops
   - Medium windows (8-15 nodes) capture meaningful code blocks
   - Large windows (20+ nodes) are good for finding duplicate functions

2. **Threshold Impact**:
   - Below 0.6: Too many false positives
   - 0.7-0.8: Good balance for most use cases
   - Above 0.85: Only very similar code is detected

3. **Size Tolerance Impact**:
   - Below 0.2: May miss similar patterns with slight variations
   - 0.2-0.3: Good for most cases
   - Above 0.4: May compare very different sized code blocks

## Default Recommendation

Based on the analysis, the recommended default parameters are:

```bash
--overlap -t 0.75 --overlap-min-window 8 --overlap-max-window 25 --overlap-size-tolerance 0.25
```

These provide a good balance between detecting meaningful overlaps and avoiding false positives.