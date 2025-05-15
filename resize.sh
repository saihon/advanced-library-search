#!/usr/bin/env bash

set -euo pipefail

func_usage() {
    local filename=$(basename "$0")
    cat <<EOS

Usage: $filename [-f] <input_icon_path> [sizes...]

  Resizes the input icon to specified sizes.

Arguments:
  <input_icon_path>   Path to the source icon file (e.g., icons/icon-128.png).
                      The input file itself will not be overwritten by this script.
  [sizes...]          Optional list of sizes (e.g., 48 19 16).
                      Defaults to 128 48 19 16 if not provided.

Options:
  -f, --force         Overwrite existing output files (excluding the input file)
                      without asking.
  -h, --help          Show this help message and exit.

Requires: ImageMagick (convert command)

Example:
  \$ $filename icons/icon-128.png
  \$ $filename -f icons/icon-active-128.png 48 16
  \$ $filename icons/logo.svg 48 32 16 # SVG input might also work

EOS
}

func_main() {
    # Check if convert command exists
    if ! type convert >/dev/null 2>&1; then
        echo 'Error: imagemagick (convert command) not installed.' >&2
        exit 1
    fi

    local force_overwrite=0
    local sizes=(128 48 19 16) # Default sizes
    local input_file=""
    local remaining_args=()

    # Option parsing
    while [[ $# -gt 0 ]]; do
        case "$1" in
        -f | --force)
            force_overwrite=1
            shift # past argument
            ;;
        -h | --help)
            func_usage
            exit 0
            ;;
        -*) # Unknown option
            echo "Unknown option: $1" >&2
            func_usage
            exit 1
            ;;
        *) # Non-option arguments
            remaining_args+=("$1")
            shift # past argument
            ;;
        esac
    done

    # Set positional arguments back for easier handling
    set -- "${remaining_args[@]}"

    # Check for input file argument
    if [ $# -eq 0 ]; then
        echo "Error: Input icon path is required." >&2
        func_usage
        exit 1
    fi
    # --- Modification: Get absolute path for reliable comparison ---
    # input_file="$1" # Original
    input_file=$(realpath "$1") # Use realpath if available for robustness
    if [ $? -ne 0 ]; then
        echo "Error: Could not determine real path for input file: $1" >&2
        # Fallback if realpath is not available or fails
        if [[ "$1" == /* ]]; then
            input_file="$1" # Already absolute
        else
            input_file="$PWD/$1" # Assume relative to current dir
        fi
        echo "Warning: Using potentially non-canonical path: $input_file" >&2
    fi
    shift # past input file argument
    # --- End Modification ---

    # Check if input file exists
    if [ ! -f "$input_file" ]; then
        # Check original path in error message for clarity
        echo "Error: Input file not found: ${remaining_args[0]}" >&2
        exit 1
    fi

    # Use remaining arguments as sizes if provided
    if [ $# -gt 0 ]; then
        # Validate all sizes are numbers before assigning
        local valid_sizes=()
        for s in "$@"; do
            if [[ "$s" =~ ^[0-9]+$ ]]; then
                valid_sizes+=("$s")
            else
                echo "Warning: Invalid size '$s' provided, ignoring." >&2
            fi
        done
        if [ ${#valid_sizes[@]} -gt 0 ]; then
            sizes=("${valid_sizes[@]}")
        else
            echo "Error: No valid sizes provided." >&2
            func_usage
            exit 1
        fi
    fi

    local input_dir=$(dirname "$input_file")
    # Extract base name without extension and trailing digits (adjust regex if needed)
    local base_name=$(basename "$input_file" | sed 's/\.[^.]*$//; s/-[0-9]*$//') # Allow multi-digit sizes
    # --- Modification: Ensure base_name is not empty if input has no digits/hyphen ---
    if [[ -z "$base_name" ]]; then
        # If the pattern removal resulted in an empty string (e.g. "128.png"), use the name without extension
        base_name=$(basename "$input_file" | sed 's/\.[^.]*$//')
    fi
    # --- End Modification ---
    local extension="${input_file##*.}" # Get extension (png, svg, etc.)

    echo "Input file: $input_file"
    echo "Output base name: $base_name"
    echo "Output directory: $input_dir"
    echo "Target sizes: ${sizes[*]}"
    echo "Force overwrite: $force_overwrite"
    echo # Add a newline for better formatting

    local error_count=0
    for s in "${sizes[@]}"; do
        # Validate size again just in case (though filtered earlier)
        if ! [[ "$s" =~ ^[0-9]+$ ]]; then
            echo "Internal Warning: Invalid size '$s' in loop, skipping." >&2
            continue
        fi

        local output_file="${input_dir}/${base_name}-${s}.png" # Always output as PNG
        # --- Modification: Get absolute path for reliable comparison ---
        local output_file_abs
        # Check if output path is already absolute
        if [[ "$output_file" == /* ]]; then
            output_file_abs="$output_file"
        else
            # Handle potential relative paths like ../ or ./
            output_file_abs=$(realpath -m "${output_file}") # -m allows non-existent paths
            if [ $? -ne 0 ]; then
                echo "Warning: Could not determine real path for potential output: $output_file. Using basic path." >&2
                output_file_abs="$PWD/$output_file" # Fallback
            fi
        fi
        # --- End Modification ---

        # --- Modification: Check if output path is identical to input path ---
        # Compare absolute paths to avoid issues with relative vs absolute paths
        if [ "$output_file_abs" = "$input_file" ]; then
            echo "Skipping size ${s}: Output path matches input file path (${output_file})."
            continue # Skip to the next size
        fi
        # --- End Modification ---

        echo -n "Generating ${output_file} (${s}x${s})... "

        # Check if output file exists and handle overwrite
        if [ -f "$output_file" ] && [ "$force_overwrite" -eq 0 ]; then
            read -p "exists. Overwrite? (y/N): " -n 1 -r REPLY
            echo # Move to new line
            if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
                echo "Skipped."
                continue
            fi
        elif [ -f "$output_file" ] && [ "$force_overwrite" -eq 1 ]; then
            echo -n "(Overwriting existing file due to -f)... "
        fi

        # Execute convert command
        # -background none: Try to preserve transparency
        # -resize ${s}x${s}: Resize geometry
        # Use +profile '*' to remove metadata (optional, reduces file size)
        if convert "$input_file" -background none -resize "${s}x${s}" +profile '*' "$output_file"; then
            echo "Done."
        else
            echo "Failed! (convert command returned error)" >&2
            # Attempt to remove partially created/failed file
            rm -f "$output_file" 2>/dev/null
            error_count=$((error_count + 1))
        fi
    done

    echo # Add a newline for separation
    if [ "$error_count" -gt 0 ]; then
        echo "Finished with $error_count error(s)." >&2
        exit 1 # Indicate failure
    else
        echo "All requested icons generated successfully."
    fi
}

# Execute main function with all arguments
func_main "$@"
