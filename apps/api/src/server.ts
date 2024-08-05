import express from 'express'
import cors from 'cors'
import { CompilerService } from './services/compiler'

const app = express()

app.use(cors())
app.use(express.json())

app.post('/api/v1/compile', async (req, res) => {
    const { component, apiKey } = req.body

    if (!component) {
        return res.status(400).json({ error: 'Component is required' })
    }

    let result = null

    try {
        result = await CompilerService.compileCode(component, apiKey)
    } catch (e) {
        console.error("Error compiling code", e)
        return res.status(500).json({ error: 'Could not compile the code' })
    }

    res.json({ html: result })
})

app.listen(3210, () => {
    console.log('Server is running on port 3210')
})


