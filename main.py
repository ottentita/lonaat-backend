import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def main():
    print("Environment variables loaded successfully.")
    # Example: Print a specific environment variable
    print("Example API Key:", os.getenv("EXAMPLE_API_KEY"))

if __name__ == "__main__":
    main()
