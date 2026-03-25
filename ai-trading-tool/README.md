# AI Trading Tool

## Overview
The AI Trading Tool is a web application designed to analyze trading profiles and provide tailored recommendations based on user input. It leverages the Anthropic API to generate insights and strategies for traders of various experience levels.

## Project Structure
```
ai-trading-tool
├── src
│   ├── server.js            # Main entry point of the application
│   ├── routes
│   │   └── analyze.js       # Routing logic for the analysis endpoint
│   ├── services
│   │   └── anthropicClient.js # Functions to interact with the Anthropic API
│   └── utils
│       └── jsonParser.js     # Utility functions for JSON parsing
├── .env                      # Environment variables
├── .gitignore                # Files and directories to ignore in Git
├── package.json              # npm configuration file
├── README.md                 # Project documentation
└── tsconfig.json             # TypeScript configuration file
```

## Setup Instructions
1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd ai-trading-tool
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the root directory and add your API keys and other configuration settings.

4. **Run the application**:
   ```bash
   npm start
   ```

## Usage
- Access the application by navigating to `http://localhost:3000` in your web browser.
- Use the provided endpoints to analyze trading profiles and receive recommendations.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.