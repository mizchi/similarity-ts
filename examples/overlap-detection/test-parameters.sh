#!/bin/bash

# Test script for overlap detection parameters

BINARY="../../target/debug/similarity-ts"

echo "=== Testing Overlap Detection Parameters ==="
echo ""

# Test 1: Exact duplication with different parameters
echo "Test 1: Exact duplication patterns"
echo "--------------------------------"

echo "1.1 Default-like parameters (threshold=0.8, window=5-20)"
$BINARY exact-duplication.js --experimental-overlap -t 0.8 --experimental-overlap-min-window 5 --experimental-overlap-max-window 20 --experimental-overlap-size-tolerance 0.2 | grep -E "(Similarity:|Total overlaps)"

echo ""
echo "1.2 Strict parameters (threshold=0.9, window=10-30)"
$BINARY exact-duplication.js --experimental-overlap -t 0.9 --experimental-overlap-min-window 10 --experimental-overlap-max-window 30 --experimental-overlap-size-tolerance 0.1 | grep -E "(Similarity:|Total overlaps)"

echo ""
echo "1.3 Relaxed parameters (threshold=0.6, window=3-15)"
$BINARY exact-duplication.js --experimental-overlap -t 0.6 --experimental-overlap-min-window 3 --experimental-overlap-max-window 15 --experimental-overlap-size-tolerance 0.3 | grep -E "(Similarity:|Total overlaps)"

echo ""
echo ""

# Test 2: Similar patterns
echo "Test 2: Similar algorithmic patterns"
echo "-----------------------------------"

echo "2.1 Default-like parameters"
$BINARY similar-patterns.js --experimental-overlap -t 0.8 --experimental-overlap-min-window 5 --experimental-overlap-max-window 20 --experimental-overlap-size-tolerance 0.2 | grep -E "(Similarity:|Total overlaps)"

echo ""
echo "2.2 Focus on small patterns (window=3-10)"
$BINARY similar-patterns.js --experimental-overlap -t 0.7 --experimental-overlap-min-window 3 --experimental-overlap-max-window 10 --experimental-overlap-size-tolerance 0.3 | grep -E "(Similarity:|Total overlaps)"

echo ""
echo "2.3 Focus on large patterns (window=10-30)"
$BINARY similar-patterns.js --experimental-overlap -t 0.7 --experimental-overlap-min-window 10 --experimental-overlap-max-window 30 --experimental-overlap-size-tolerance 0.2 | grep -E "(Similarity:|Total overlaps)"

echo ""
echo ""

# Test 3: Partial overlaps
echo "Test 3: Partial overlaps in complex functions"
echo "--------------------------------------------"

echo "3.1 Default-like parameters"
$BINARY partial-overlap.js --experimental-overlap -t 0.8 --experimental-overlap-min-window 5 --experimental-overlap-max-window 20 --experimental-overlap-size-tolerance 0.2 | grep -E "(Similarity:|Total overlaps)"

echo ""
echo "3.2 Medium window sizes (window=8-25)"
$BINARY partial-overlap.js --experimental-overlap -t 0.75 --experimental-overlap-min-window 8 --experimental-overlap-max-window 25 --experimental-overlap-size-tolerance 0.25 | grep -E "(Similarity:|Total overlaps)"

echo ""
echo ""

# Test 4: False positive analysis
echo "Test 4: False positive prone patterns"
echo "------------------------------------"

echo "4.1 High threshold to reduce false positives (threshold=0.9)"
$BINARY false-positives.js --experimental-overlap -t 0.9 --experimental-overlap-min-window 5 --experimental-overlap-max-window 20 --experimental-overlap-size-tolerance 0.1 | grep -E "(Similarity:|Total overlaps)"

echo ""
echo "4.2 Minimum window size filter (window=8+)"
$BINARY false-positives.js --experimental-overlap -t 0.8 --experimental-overlap-min-window 8 --experimental-overlap-max-window 25 --experimental-overlap-size-tolerance 0.2 | grep -E "(Similarity:|Total overlaps)"

echo ""
echo "4.3 Very relaxed (shows false positives)"
$BINARY false-positives.js --experimental-overlap -t 0.5 --experimental-overlap-min-window 3 --experimental-overlap-max-window 10 --experimental-overlap-size-tolerance 0.5 | grep -E "(Similarity:|Total overlaps)"

echo ""
echo ""

# Test 5: Cross-file comparison
echo "Test 5: Cross-file overlap detection"
echo "-----------------------------------"

echo "5.1 Exact duplication vs Similar patterns"
$BINARY exact-duplication.js similar-patterns.js --experimental-overlap -t 0.7 --experimental-overlap-min-window 5 --experimental-overlap-max-window 20 --experimental-overlap-size-tolerance 0.3 | grep -E "(Similarity:|Total overlaps)"

echo ""
echo "5.2 Similar patterns vs Partial overlap"
$BINARY similar-patterns.js partial-overlap.js --experimental-overlap -t 0.7 --experimental-overlap-min-window 5 --experimental-overlap-max-window 20 --experimental-overlap-size-tolerance 0.3 | grep -E "(Similarity:|Total overlaps)"