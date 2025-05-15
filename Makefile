# Makefile for Advanced Library Search Firefox Extension

# --- Variables ---

# Output filename for the packaged extension
TARGET = advanced-library-search.zip
# You can use .xpi if you prefer, Firefox accepts both for temporary loading
# TARGET = advanced-library-search.xpi

# Source files and directories to include in the package
SOURCES = manifest.json index.html css/ js/ icons/

# --- Targets ---

# Default target: build the extension
all: build

# Build the extension package (zip file)
# -r: Recurse into directories
# -FS: Sync filesystem contents (useful for reproducibility if files change)
# -9: Use highest compression level
build: $(TARGET)

# zip option -x Exclude OS specific hidden files
$(TARGET): $(SOURCES)
	@echo "Packaging extension into $(TARGET)..."
	@# Ensure the target directory exists if needed (not strictly needed here)
	@# mkdir -p $(dir $(TARGET))
	@# Using zip command to create the archive
	@zip -r -FS $(TARGET) $(SOURCES) -x '*.DS_Store' -x '*._*'
	@echo "Extension packaged successfully: $(TARGET)"

# Clean up the build artifact
clean:
	@echo "Cleaning up build artifacts..."
	@rm -f $(TARGET)
	@echo "Cleanup complete."

# Declare targets that are not actual files
.PHONY: all build clean