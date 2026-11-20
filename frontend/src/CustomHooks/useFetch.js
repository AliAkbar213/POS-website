import { apiFetch } from "../auth"
import { useEffect, useState } from "react"

function useFetch(role, url) {
  const [result, setResult] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchData() {
      try {
        const response = await apiFetch(role, url, { signal: controller.signal })
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
  }, [role, url])

  if (result?.url !== url) {
    return { data: [], loading: true, error: null }
  }

  return { data: result.data, loading: false, error: result.error }
}

export default useFetch
