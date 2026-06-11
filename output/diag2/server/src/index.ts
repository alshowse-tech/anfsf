// [generated]
import express from 'express'
import helloRouter from './routes/hello'

const app = express()
const port = 4000

app.use('/api', helloRouter)

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})

export default app
