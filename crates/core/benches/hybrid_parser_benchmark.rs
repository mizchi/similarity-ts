use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion};
use similarity_core::language_parser::{Language, ParserFactory};

const SMALL_JS: &str = r#"
function greet(name) {
    return `Hello, ${name}!`;
}

const add = (a, b) => a + b;
"#;

const MEDIUM_JS: &str = r#"
class Calculator {
    constructor() {
        this.result = 0;
    }
    
    add(x) {
        this.result += x;
        return this;
    }
    
    subtract(x) {
        this.result -= x;
        return this;
    }
    
    multiply(x) {
        this.result *= x;
        return this;
    }
    
    divide(x) {
        if (x !== 0) {
            this.result /= x;
        }
        return this;
    }
    
    getResult() {
        return this.result;
    }
}

function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

const fibonacci = (n) => {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
};
"#;

const SMALL_PY: &str = r#"
def greet(name):
    return f"Hello, {name}!"

add = lambda a, b: a + b
"#;

const MEDIUM_PY: &str = r#"
class Calculator:
    def __init__(self):
        self.result = 0
    
    def add(self, x):
        self.result += x
        return self
    
    def subtract(self, x):
        self.result -= x
        return self
    
    def multiply(self, x):
        self.result *= x
        return self
    
    def divide(self, x):
        if x != 0:
            self.result /= x
        return self
    
    def get_result(self):
        return self.result

def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
"#;

fn benchmark_parsers(c: &mut Criterion) {
    let mut group = c.benchmark_group("Hybrid Parser Performance");

    // Create parsers
    let mut js_parser = ParserFactory::create_parser(Language::JavaScript).unwrap();
    let mut py_parser = ParserFactory::create_parser(Language::Python).unwrap();

    // Benchmark parsing
    group.bench_with_input(BenchmarkId::new("Parse", "JS Small"), &SMALL_JS, |b, &source| {
        b.iter(|| {
            let tree = js_parser.parse(black_box(source), "test.js").unwrap();
            black_box(tree);
        });
    });

    group.bench_with_input(BenchmarkId::new("Parse", "Python Small"), &SMALL_PY, |b, &source| {
        b.iter(|| {
            let tree = py_parser.parse(black_box(source), "test.py").unwrap();
            black_box(tree);
        });
    });

    group.bench_with_input(BenchmarkId::new("Parse", "JS Medium"), &MEDIUM_JS, |b, &source| {
        b.iter(|| {
            let tree = js_parser.parse(black_box(source), "test.js").unwrap();
            black_box(tree);
        });
    });

    group.bench_with_input(BenchmarkId::new("Parse", "Python Medium"), &MEDIUM_PY, |b, &source| {
        b.iter(|| {
            let tree = py_parser.parse(black_box(source), "test.py").unwrap();
            black_box(tree);
        });
    });

    // Benchmark function extraction
    group.bench_with_input(
        BenchmarkId::new("Extract Functions", "JS Small"),
        &SMALL_JS,
        |b, &source| {
            b.iter(|| {
                let funcs = js_parser.extract_functions(black_box(source), "test.js").unwrap();
                black_box(funcs);
            });
        },
    );

    group.bench_with_input(
        BenchmarkId::new("Extract Functions", "Python Small"),
        &SMALL_PY,
        |b, &source| {
            b.iter(|| {
                let funcs = py_parser.extract_functions(black_box(source), "test.py").unwrap();
                black_box(funcs);
            });
        },
    );

    group.bench_with_input(
        BenchmarkId::new("Extract Functions", "JS Medium"),
        &MEDIUM_JS,
        |b, &source| {
            b.iter(|| {
                let funcs = js_parser.extract_functions(black_box(source), "test.js").unwrap();
                black_box(funcs);
            });
        },
    );

    group.bench_with_input(
        BenchmarkId::new("Extract Functions", "Python Medium"),
        &MEDIUM_PY,
        |b, &source| {
            b.iter(|| {
                let funcs = py_parser.extract_functions(black_box(source), "test.py").unwrap();
                black_box(funcs);
            });
        },
    );

    group.finish();
}

criterion_group!(benches, benchmark_parsers);
criterion_main!(benches);
