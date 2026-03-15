import re
import os

def validate_api_key_format(key_name, key_value):
    if not key_value:
        return f"{key_name} is missing."

    # Example validation rules
    if key_name in ["JVZOO_API_KEY", "DIGISTORE_API_KEY", "WARRIORPLUS_API_KEY"]:
        if not re.match(r"^[a-f0-9]{64}$", key_value):
            return f"{key_name} has an invalid format."

    if key_name == "ALIEXPRESS_APP_KEY":
        if not key_value.isdigit():
            return f"{key_name} should be numeric."

    if key_name == "ADMITAD_CLIENT_SECRET":
        if len(key_value) < 32:
            return f"{key_name} is too short."

    return f"{key_name} is valid."

def main():
    keys_to_validate = [
        "JVZOO_API_KEY",
        "DIGISTORE_API_KEY",
        "WARRIORPLUS_API_KEY",
        "ALIEXPRESS_APP_KEY",
        "ADMITAD_CLIENT_SECRET",
    ]

    for key in keys_to_validate:
        result = validate_api_key_format(key, os.getenv(key))
        print(result)

if __name__ == "__main__":
    main()