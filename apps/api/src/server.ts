import express from 'express'
import cors from 'cors'
import { CompilerService } from './services/compiler'

import "dotenv/config"
import { put } from '@vercel/blob'

const app = express()

app.use(cors())

app.post('/api/v1/image', express.raw({ type: 'application/octet-stream', limit: '10mb' }), async (req, res) => {
    console.log("Reaching api")
    console.log("Request", req.body)

    const file = req.body
    const fileName = req.query.filename as string

    if (!file || !fileName) {
        return res.status(400).json({ error: 'File and fileName are required' })
    }

    const blob = await put(fileName, file, {
        access: 'public',
    });


    res.json({ url: blob.url })

})


app.post('/api/v1/compile', express.json(), async (req, res) => {
    const { payload, mode, apiKey } = req.body

    if (!payload) {
        return res.status(400).json({ error: 'Component is required' })
    }

    let result = null

    try {
        result = await CompilerService.compileCode(payload, mode, apiKey)
    } catch (e) {
        console.error("Error compiling code", e)
        return res.status(500).json({ error: 'Could not compile the code' })
    }

    res.json({ html: result })
})

app.listen(3210, () => {
    console.log('Server is running on port 3210')
})


