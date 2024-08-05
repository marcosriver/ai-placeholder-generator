import { build } from 'esbuild';
import path from 'node:path'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

const extractFirstCodeBlock = (input: string) => {

    console.log("INPUT:", input)

    const pattern = /```(\w+)?\n([\s\S]+?)\n```/g;

    let matches;
    while ((matches = pattern.exec(input)) !== null) {
        const language = matches[1];
        const codeBlock = matches[2];
        if (language === undefined || language === "jsx" || language === "javascript") {
            console.log("CODE BLOCK:", codeBlock)
            return codeBlock as string;
        }
    }

    throw new Error("No code block found in input");
};


const getAIGeneratedComponent = async (code: string, key: string) => {
    console.log("KEY:", key)

    const openAI = createOpenAI({
        apiKey: key
    })

    const { text } = await generateText({
        model: openAI('gpt-4-turbo'),
        temperature: 0,
        maxTokens: 1000,
        messages: [
            {
                role: 'system',
                content: `
            You are a programming assistant.
            You are going to recieve a react component either in Typescript or Javascript.
            Create a react component using Tailwind.
            You are only going to reply with the component code. Don't output any extra text.
            The component you generate will not add any dependency other than anything that is needed from React.
            Do it using the animation from tailwind animate-pulse.
            Don't add any useState or useEffect hooks.
            You are just going to create a loading placeholder component that will be displayed while the data from the real component
            is being fetched.
            Don't add any text that says loading. Just created the loading component and substitute the elements of the real components
            with elements using the animate-pulse animation to give a loading look and feel.
            The code block should be a jsx code block.
            Don't use any other color than gray-300.
            Don't import any other components.
        `
            },
            {
                role: 'user',
                content: code
            }
        ]
    })

    return text
}

// Transforms the TSX code to JS using esbuild
const esbuildCompile = async (code: string) => {

    const appPath = path.join(process.cwd(), 'compiled-app/App.jsx');

    let result = null
    try {
        result = await build({
            entryPoints: [appPath],
            loader: {
                '.js': 'jsx',
                '.ts': 'tsx',
                '.tsx': 'tsx'
            },
            format: 'iife',
            bundle: true,
            minify: true,
            target: 'esnext',
            platform: 'browser',
            write: false,
            plugins: [
                {
                    name: 'virtual-files',
                    setup(build) {
                        // Intercept import of Placeholder.jsx
                        build.onResolve({ filter: /^\.\/placeholder\.jsx$/ }, args => ({
                            path: args.path,
                            namespace: 'virtual',
                        }));

                        // Load virtual content for Placeholder.jsx
                        build.onLoad({ filter: /^\.\/placeholder\.jsx$/, namespace: 'virtual' }, args => ({
                            contents: code,
                            loader: 'jsx',
                            resolveDir: path.join(process.cwd(), 'compiled-app')
                        }));
                    }
                }

            ],
        });
    } catch (e) {
        console.log("Error compiling code", e);
    }

    if (result === null || result?.outputFiles?.length === 0) {
        return "";
    }

    const text = result?.outputFiles?.at(0)?.text || '';

    return text
};

export const CompilerService = {
    compileCode: async (code: string, key: string) => {

        let generatedCode = null

        try {
            generatedCode = await getAIGeneratedComponent(code, key)
            generatedCode = extractFirstCodeBlock(generatedCode);
        } catch (e) {
            console.error("Error generating the code with the AI", e)
            throw e
        }

        // Transform the code from TSX to JS
        let output = null
        try {
            output = await esbuildCompile(generatedCode)
        } catch (e) {
            console.error("Error compiling the code", e)
            throw e
        }

        const html = `<!DOCTYPE html>
            <html lang="en">
            <head>  
                <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
                <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body style="background-color:#fff">
                <script defer>window.addEventListener("DOMContentLoaded", (event) => {
                ${output}
                });</script>
                <div id="root"></div>
            </body>
            </html>
      `;

        return html;
    }

}

