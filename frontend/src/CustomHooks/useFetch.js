import { useEffect, useState } from "react"

function useFetch(url) {
  const [result, setResult] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchData() {
      try {
        const response = await fetch(url, { credentials: "include", signal: controller.signal })
        if (!response.ok) {
          throw new Error(`Request failed (HTTP ${response.status}).`)
        }
        const data = await response.json()
        if (!controller.signal.aborted) {
          setResult({ url, data, error: null })
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({ url, data: [], error: error.message })
        }
      }
    }

    fetchData()
    return () => controller.abort()
  }, [url])

  if (result?.url !== url) {
    return { data: [], loading: true, error: null }
  }

  return { data: result.data, loading: false, error: result.error }
}

export default useFetch
