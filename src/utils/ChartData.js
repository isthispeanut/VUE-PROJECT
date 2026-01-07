// Helpers to turn passenger records into chart-ready series (labels, values, rows)
// Simple, readable helpers so the Vue components can make charts easily
export const METRICS = [
	{ key: 'purchases', label: 'Purchases' },
	{ key: 'visits', label: 'Visits' },
	{ key: 'miles', label: 'Miles' },
	{ key: 'avgSpend', label: 'AvgSpend' },
	{ key: 'totalSpend', label: 'TotalSpend' },
	{ key: 'spendPerVisit', label: 'SpendPerVisit' }
]

function safeNumber(v) {
	const n = Number(v)
	return Number.isFinite(n) ? n : 0
}

function computeDerived(p) {
	const purchases = safeNumber(p.purchases)
	const visits = safeNumber(p.visits)
	const miles = safeNumber(p.miles)
	const avgSpend = safeNumber(p.avgSpend)
	const totalSpend = purchases * avgSpend
	const spendPerVisit = visits > 0 ? totalSpend / visits : 0
	const name = [p.title, p.firstName, p.lastName].filter(Boolean).join(' ').trim() || p.passengerId || 'Unknown'
	return { ...p, purchases, visits, miles, avgSpend, totalSpend, spendPerVisit, name }
}

function minMaxNormalize(arr) {
	if (!arr || arr.length === 0) return arr
	const min = Math.min(...arr)
	const max = Math.max(...arr)
	if (min === max) return arr.map(() => 0)
	return arr.map(v => ((v - min) / (max - min)) * 100)
}

// buildSeries(passengers, metricKey, options)
// Returns an object the charts can use: { labels, values, rows }
// - `normalize`: scale values 0-100
// - `sort`: 'none' | 'asc' | 'desc'
export function buildSeries(passengers = [], metricKey = 'purchases', options = {}) {
	const { normalize = false, sort = 'none' } = options || {}
	const rows = (passengers || []).map(computeDerived)

	// pick the number for each row based on metricKey
	const values = rows.map(r => {
		if (metricKey === 'totalSpend') return r.totalSpend
		if (metricKey === 'spendPerVisit') return r.spendPerVisit
		return safeNumber(r[metricKey])
	})

	let finalValues = values.slice()
	if (normalize) finalValues = minMaxNormalize(finalValues)

	// attach the final value to each row object
	const combined = rows.map((r, i) => ({ ...r, value: finalValues[i] }))

	// apply sorting if requested
	if (sort === 'desc') combined.sort((a, b) => b.value - a.value)
	else if (sort === 'asc') combined.sort((a, b) => a.value - b.value)

	const labels = combined.map(r => r.name)
	const outValues = combined.map(r => r.value)
	return { labels, values: outValues, rows: combined }
}

export default { METRICS, buildSeries }


