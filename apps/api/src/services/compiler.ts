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


const getAIGeneratedComponent = async (payload: string, mode: string, key: string) => {

    const openAI = createOpenAI({
        apiKey: key
    })

    const { text } = await generateText({
        model: openAI('gpt-4o-2024-05-13'),
        temperature: 0,
        maxTokens: 1000,
        prompt: `
        ${payload}

        I want a placeholder component in ReactJS using Tailwind CSS. 

        The placeholder needs to be done from the ${mode === 'code' ? 'code' : 'image'} sent.
        I just want the output of the jsx file. No extra text.

        I just want the placeHolder component. Don't do any extra components.
        Use only the color gray-300 for the components and gray-100 for the background
        Don't include any components or dependency.
        Substitute the elements in the code with divs that match the width and height and the placement of them but use tailwind animate-pulse to create the loading animation on the elements.
        export the component as default
        ${mode === 'image' && 'Think of the image as the component that we need to create the placeholder for. You have to match the number of items on the image and create a layout as similar as possible'}
        `

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
    compileCode: async (payload: string, mode: string, key: string) => {

        let generatedCode = null

        try {
            generatedCode = await getAIGeneratedComponent(payload, mode, key)
            generatedCode = extractFirstCodeBlock(generatedCode);
            console.log("GENERATED CODE:", generatedCode)
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

