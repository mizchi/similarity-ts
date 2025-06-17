use clap::Parser;
use ts_similarity_core::{calculate_tsed_from_code, TSEDOptions};
use std::fs;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// First TypeScript file
    file1: String,
    
    /// Second TypeScript file
    file2: String,
    
    /// Rename cost (default: 0.3)
    #[arg(long, default_value_t = 0.3)]
    rename_cost: f64,
    
    /// Delete cost (default: 1.0)
    #[arg(long, default_value_t = 1.0)]
    delete_cost: f64,
    
    /// Insert cost (default: 1.0)
    #[arg(long, default_value_t = 1.0)]
    insert_cost: f64,
}

fn main() -> anyhow::Result<()> {
    let args = Args::parse();
    
    // Read files
    let code1 = fs::read_to_string(&args.file1)?;
    let code2 = fs::read_to_string(&args.file2)?;
    
    // Set up options
    let mut options = TSEDOptions::default();
    options.apted_options.rename_cost = args.rename_cost;
    options.apted_options.delete_cost = args.delete_cost;
    options.apted_options.insert_cost = args.insert_cost;
    
    // Calculate similarity
    match calculate_tsed_from_code(&code1, &code2, &args.file1, &args.file2, &options) {
        Ok(similarity) => {
            println!("TSED Similarity: {:.2}%", similarity * 100.0);
            println!("Distance: {:.4}", 1.0 - similarity);
        }
        Err(e) => {
            eprintln!("Error: {}", e);
            std::process::exit(1);
        }
    }
    
    Ok(())
}