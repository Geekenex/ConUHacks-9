from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()
open_ai_api = os.getenv("OPENAI_API_KEY")

def generate_base64_png(csv_content: str, question: str, answer: str) -> str:
    # Extract the first 5 lines from the CSV as sample data
    sample_data_lines = csv_content.splitlines()[:5]
    sample_data = "\n".join(sample_data_lines)

    # Build the prompt with sample data, question, answer, and the placeholder "PROMPT"
    prompt_text = (
        f"Sample Data:\n{sample_data}\n"
        f"Question: {question}\n"
        f"Answer: {answer}\n"
        "PROMPT"
    )

    # Define the system and user messages for the chat completion
    system_message = {
        "role": "system",
        "content": (
            "You are a code generator that outputs executable Python code. You do not use any markdown formatting."
            "The code, when executed, stores a base64-encoded PNG image as a string in a local variable named result."
            "The csv data is provided as a string in the variable csv_content"
            "You do not need to assign the 'csv_content' variable as it is already provided and populated outside of the scope of your code."
            "You have access to the following libraries: csv, base64, matplotlib.pyplot, io"
            "You are provided with a sample of the full CSV data and a question-answer pair."
            "Your task is to generate python code that reads the full CSV data, processes it to generate a visual representation of the data that best supports the answer to the question."
            "Example 1: Dataset contains information about countries and their populations. Question: 'What is the highest populated country?' Answer: 'India'. Your code should generate a bar chart showing the population of each country on the y axis and the country on the x axis."
            "Example 2: Dataset contains information about Montreal Crimes. Question: 'What is the most common crime in Montreal?' Answer: 'Vehicle Theft'. Your code should generate a pie chart showing the distribution of different crime types with percentages shown on each crime type."
            "Example 3: Dataset contains information about Anime Ratings. Question: 'Which show had the highest rating in 2018? Answer: 'Fullmetal Alchemist: Brotherhood'. Your code should generate a line chart showing the ratings of different shows over time, with the rating on the y axis and years on the x axis."
            "You can assume that the CSV data is well-formatted and contains the necessary information to generate the visual representation."
            "Part of your responsibility is to ensure the generated visualization is clear, informative, and visually appealing. In that regard, you can choose the type of visualization that best suits the data and question, but to avoid clutter, limit the number of data points to the top 5-10 relevant entries, depending on scenario. Data points should almost always be labeled. For example, in a bar chart, each bar should be labeled with the corresponding numerical value."
            "The style for the visualization should be in black background with no gridlines, white labels. the visual itself should be tints of asthetically pleasing yellowish-redish tints."
        )
    }
    user_message = {"role": "user", "content": prompt_text}

    # Create an OpenAI client and call the chat completion endpoint
    client = OpenAI(api_key=open_ai_api)
    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[system_message, user_message],
        temperature=0.3,
        top_p=0.3,
        max_tokens=1500
    )
    code_str = completion.choices[0].message.content.strip()

    # Execute the generated code and retrieve the base64 PNG content
    local_vars = {"csv_content": csv_content}
    try:
        exec(code_str, local_vars)
    except Exception as e:
        print("Error executing generated code:", e)
        raise ValueError("An error occurred while executing generated code: " + str(e)) from e

    if "result" in local_vars:
        return local_vars["result"]
    else:
        raise ValueError("Executed code did not produce a 'result' variable.")
