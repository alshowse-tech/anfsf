// [generated]
interface HelloWorldProps {
  message: string
}

export default function HelloWorld({ message }: HelloWorldProps) {
  return (
    <h1 className="text-4xl font-bold text-blue-600">
      {message}
    </h1>
  )
}
