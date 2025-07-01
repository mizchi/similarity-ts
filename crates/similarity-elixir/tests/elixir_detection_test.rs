use assert_cmd::Command;
use predicates::prelude::*;

mod elixir_test_helper;
use elixir_test_helper::create_elixir_file;

#[test]
fn test_elixir_function_detection() {
    let (_dir, file_path) = create_elixir_file(
        r#"
defmodule Calculator do
  def add(a, b) do
    a + b
  end

  def subtract(a, b) do
    a - b
  end

  defp private_multiply(a, b) do
    a * b
  end
end

defmodule MathUtils do
  def factorial(0), do: 1
  def factorial(n) when n > 0 do
    n * factorial(n - 1)
  end
end
"#,
    );

    let mut cmd = Command::cargo_bin("similarity-elixir").unwrap();
    cmd.arg(&file_path);

    cmd.assert()
        .success()
        .stdout(predicate::str::contains("Found 4 functions"))
        .stdout(predicate::str::contains("add"))
        .stdout(predicate::str::contains("subtract"))
        .stdout(predicate::str::contains("private_multiply"))
        .stdout(predicate::str::contains("factorial"));
}

#[test]
fn test_elixir_similarity() {
    let (_dir, file_path) = create_elixir_file(
        r#"
defmodule Example do
  def similar_function1(list) do
    list
    |> Enum.filter(&(&1 > 0))
    |> Enum.map(&(&1 * 2))
    |> Enum.sum()
  end

  def similar_function2(items) do
    items
    |> Enum.filter(&(&1 > 0))
    |> Enum.map(&(&1 * 2))
    |> Enum.sum()
  end

  def different_function(data) do
    case data do
      {:ok, value} -> value
      {:error, _} -> nil
    end
  end
end
"#,
    );

    let mut cmd = Command::cargo_bin("similarity-elixir").unwrap();
    cmd.arg(&file_path).arg("-t").arg("0.8");

    cmd.assert()
        .success()
        .stdout(predicate::str::contains("similar_function1"))
        .stdout(predicate::str::contains("similar_function2"))
        .stdout(predicate::str::contains("Similarity: 100."));
}

#[test]
fn test_elixir_module_detection() {
    let (_dir, file_path) = create_elixir_file(
        r#"
defmodule User do
  defstruct [:name, :email, :age]

  def new(name, email) do
    %User{name: name, email: email}
  end
end

defprotocol Printable do
  def print(data)
end

defimpl Printable, for: User do
  def print(user) do
    "User: #{user.name}"
  end
end
"#,
    );

    let mut cmd = Command::cargo_bin("similarity-elixir").unwrap();
    cmd.arg(&file_path);

    cmd.assert()
        .success()
        .stdout(predicate::str::contains("new"))
        .stdout(predicate::str::contains("print"));
}

#[test]
fn test_elixir_edge_cases() {
    let (_dir, file_path) = create_elixir_file(
        r#"
defmodule EdgeCases do
  # Pattern matching function heads
  def process({:ok, data}), do: data
  def process({:error, _}), do: nil

  # Guard clauses
  def validate(x) when is_integer(x) and x > 0, do: true
  def validate(_), do: false

  # Anonymous functions
  def map_example(list) do
    Enum.map(list, fn x -> x * 2 end)
  end

  # Pipe operator
  def pipeline(data) do
    data
    |> String.trim()
    |> String.downcase()
    |> String.split(" ")
  end
end
"#,
    );

    let mut cmd = Command::cargo_bin("similarity-elixir").unwrap();
    cmd.arg(&file_path);

    cmd.assert()
        .success()
        .stdout(predicate::str::contains("process"))
        .stdout(predicate::str::contains("validate"))
        .stdout(predicate::str::contains("map_example"))
        .stdout(predicate::str::contains("pipeline"));
}
