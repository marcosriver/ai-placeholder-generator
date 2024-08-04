import { build } from 'esbuild';
import path from 'node:path'

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
                            namespace: 'virtual'
                        }));

                        // Load virtual content for Placeholder.jsx
                        build.onLoad({ filter: /^\.\/placeholder\.jsx$/, namespace: 'virtual' }, args => ({
                            contents: code,
                            loader: 'jsx'
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
    compileCode: async (code: string) => {

        // Transform the code from TSX to JS
        const output = await esbuildCompile(code);

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

