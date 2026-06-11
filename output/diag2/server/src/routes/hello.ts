// [generated]
import { Router, Request, Response } from 'express'

const router = Router()

router.get('/hello', (req: Request, res: Response) => {
  // TODO: implement hello logic (e.g., return dynamic message)
  res.json({ message: 'Hello World!' })
})

export default router
