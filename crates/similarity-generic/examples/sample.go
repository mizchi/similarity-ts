package main

import "fmt"

// Similar functions that should be detected
func calculateSum(numbers []int) int {
    total := 0
    for _, num := range numbers {
        total += num
    }
    return total
}

func computeTotal(values []int) int {
    sum := 0
    for _, val := range values {
        sum += val
    }
    return sum
}

// Different function
func printMessage(msg string) {
    fmt.Println("Message:", msg)
}

// Test function (can be excluded with --skip-test)
func TestCalculateSum(t *testing.T) {
    result := calculateSum([]int{1, 2, 3})
    if result != 6 {
        t.Error("Expected 6")
    }
}