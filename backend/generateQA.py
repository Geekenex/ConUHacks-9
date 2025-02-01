from openai import OpenAI
from dotenv import load_dotenv
import os
import csv 
import json
import tiktoken
import chardet


load_dotenv() 
open_ai_api=os.getenv("OPENAI_API_KEY")

def trim_csv_to_token_limit(csv_string: str, max_tokens: int, model: str = "gpt-4o-mini") -> str:
    encoding = tiktoken.encoding_for_model(model)
    tokens = encoding.encode(csv_string)
    
    if len(tokens) > max_tokens:
        trimmed_tokens = tokens[:max_tokens]
        trimmed_string = encoding.decode(trimmed_tokens)
        return trimmed_string
    return csv_string

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
    return csv_context


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
            "The questions should be general knowledge based questions about the theme of the data"
            "Do not ask specific questions about specific rows or data entries"
            "Make the questions interesting and thought provoking"
            "Half questions should be medium difficulty, quarter should be hard, one quarter should be extremely difficult"
            "Translate all data to english if written in another language"
            "Always include context, inform the user on all information they should know regarding the question such as require location and time in the form of city and year"
            "If there is temporal data such as dates inform the user on the year month range"
            "Make sure that all fake answers are plausible alternatives within the same domain as the correct answer and within the scope of the dataset provided"
            "For fake answers choose answers that are very close to the real answer, for example if the real answer is a city or location choose as fake answers locations that are geographically close to the correct city"
            "To form a fake answer relate it to the correct answer"
            "If the correct answer is a number, the fake answer should be numbers numerically close to it"
            "Return your response strictly as valid JSON in the following format (an array of objects) do not use code blocks and output as a machine readable json format without markdown:\n\n"
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
        temperature=0.9,  
        top_p=0.95,
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
    content = trim_csv_to_token_limit(content, 125500)
    result = callModel(content, num_questions)
    return result
