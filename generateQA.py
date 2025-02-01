#Read CSV
#Output QA dict

from openai import OpenAI
from dotenv import load_dotenv
import os
import csv 
import json

load_dotenv() 
open_ai_api=os.getenv("OPENAI_API_KEY")
def parseCSV(csv_content: str):
    csv_lines = csv_content.strip().splitlines()
    reader = csv.reader(csv_lines)
    rows = list(reader)
    if not rows:
        raise ValueError("CSV string is empty or invalid.")
    combined_data = []
    for row in rows:
        combined_data.append(", ".join(row))
    csv_context = "\n".join(combined_data)
    return csv_content


def callModel(csv_content, num_questions):
    system_prompt = {
        "role": "system",
        "content": "You are an assistant that generates quiz questions in JSON format."
    }
    user_prompt = {
        "role": "user",
        "content": (
            "You have the following CSV data:\n\n"
            f"{csv_content}\n\n"
            f"Based on this data, create {num_questions} quiz questions. "
            "Each question must have exactly 1 correct answer and 3 plausible but incorrect answers. "
            "Return your response strictly as valid JSON in the following format (an array of objects):\n\n"
            "[\n"
            "  {\n"
            '    "question": "string",\n'
            '    "correct_answer": "string",\n'
            '    "fake_answers": ["string", "string", "string"]\n'
            "  },\n"
            "  {\n"
            '    "question": "string",\n'
            '    "correct_answer": "string",\n'
            '    "fake_answers": ["string", "string", "string"]\n'
            "  }\n"
            "  ... up to N items ...\n"
            "]\n"
        )
    }
    
    

    

    client = OpenAI(api_key=open_ai_api)

    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[system_prompt, user_prompt],
        temperature=0.7,
        max_tokens=1500
    )
    raw_content = completion.choices[0].message.content.strip()
    
    try:
        quiz_data = json.loads(raw_content)
    except json.JSONDecodeError:
        raise ValueError(f"Response is not valid JSON:\n{raw_content}")

    
    if not isinstance(quiz_data, list):
        raise ValueError(
            f"Expected a list of questions, got: {type(quiz_data)}\nFull response:\n{quiz_data}"
        )
    return quiz_data




def generateQA(csv, num_questions):
    result = {}
    content = parseCSV(csv)
    result = callModel(content, num_questions)
    print(result)
    return result

test_string = "ID,Name,Age,Email,Country,Score 1,John Doe,28,john.doe@example.com,USA,85 2,Jane Smith,34,jane.smith@example.com,Canada,90 3,Bob Johnson,45,bob.johnson@example.com,UK,75 4,Alice Brown,29,alice.brown@example.com,Australia,88 5,Charlie Davis,38,charlie.davis@example.com,Germany,92"
num_questions = 3
generateQA(test_string, num_questions)