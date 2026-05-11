const fs = require('fs')

const secoes = [
  { n: "Somos 26", ids: ["00"] },
  { n: "Sedes", ids: ["FWC1","FWC2","FWC3","FWC4","FWC5","FWC6","FWC7","FWC8"] },

  { n: "México", p: "MEX", q: 20 },
  { n: "África do Sul", p: "RSA", q: 20 },
  { n: "Coreia do Sul", p: "KOR", q: 20 },
  { n: "Rep. Tcheca", p: "CZE", q: 20 },
  { n: "Canadá", p: "CAN", q: 20 },
  { n: "Bósnia", p: "BIH", q: 20 },
  { n: "Catar", p: "QAT", q: 20 },
  { n: "Suíça", p: "SUI", q: 20 },
  { n: "Brasil", p: "BRA", q: 20 },
  { n: "Marrocos", p: "MAR", q: 20 },
  { n: "Haiti", p: "HAI", q: 20 },
  { n: "Escócia", p: "SCO", q: 20 },
  { n: "EUA", p: "USA", q: 20 },
  { n: "Paraguai", p: "PAR", q: 20 },
  { n: "Austrália", p: "AUS", q: 20 },
  { n: "Turquia", p: "TUR", q: 20 },
  { n: "Alemanha", p: "GER", q: 20 },
  { n: "Curaçao", p: "CUW", q: 20 },
  { n: "C. Marfim", p: "CIV", q: 20 },
  { n: "Equador", p: "ECU", q: 20 },
  { n: "Holanda", p: "NED", q: 20 },
  { n: "Japão", p: "JPN", q: 20 },
  { n: "Suécia", p: "SWE", q: 20 },
  { n: "Tunísia", p: "TUN", q: 20 },
  { n: "Bélgica", p: "BEL", q: 20 },
  { n: "Egito", p: "EGY", q: 20 },
  { n: "Irã", p: "IRN", q: 20 },
  { n: "N. Zelândia", p: "NZL", q: 20 },
  { n: "Espanha", p: "ESP", q: 20 },
  { n: "Cabo Verde", p: "CPV", q: 20 },
  { n: "Arábia", p: "KSA", q: 20 },
  { n: "Uruguai", p: "URU", q: 20 },
  { n: "França", p: "FRA", q: 20 },
  { n: "Senegal", p: "SEN", q: 20 },
  { n: "Iraque", p: "IRQ", q: 20 },
  { n: "Noruega", p: "NOR", q: 20 },
  { n: "Argentina", p: "ARG", q: 20 },
  { n: "Argélia", p: "ALG", q: 20 },
  { n: "Áustria", p: "AUT", q: 20 },
  { n: "Jordânia", p: "JOR", q: 20 },
  { n: "Portugal", p: "POR", q: 20 },
  { n: "RD Congo", p: "COD", q: 20 },
  { n: "Uzbequistão", p: "UZB", q: 20 },
  { n: "Colômbia", p: "COL", q: 20 },
  { n: "Inglaterra", p: "ENG", q: 20 },
  { n: "Croácia", p: "CRO", q: 20 },
  { n: "Gana", p: "GHA", q: 20 },
  { n: "Panamá", p: "PAN", q: 20 },

  { n: "História", ids: ["FWC9","FWC10","FWC11","FWC12","FWC13","FWC14","FWC15","FWC16","FWC17","FWC18","FWC19"] },

  { n: "Coca", p: "CC", q: 14 },

  { n: "Extras", ids: ["REGU","BRON","PRAT","OURO"] }
]

let sql = `
insert into stickers (
  code,
  country,
  owned,
  duplicates,
  category
)
values
`

const values = []

secoes.forEach(secao => {
  if (secao.ids) {
    secao.ids.forEach(id => {
      values.push(`
(
  '${id}',
  '${secao.n}',
  false,
  0,
  '${secao.n}'
)
`)
    })
  }

  if (secao.p) {
    for (let i = 1; i <= secao.q; i++) {
      values.push(`
(
  '${secao.p}${i}',
  '${secao.n}',
  false,
  0,
  'Seleção'
)
`)
    }
  }
})

sql += values.join(',')

sql += ';'

fs.writeFileSync(
  'stickers_sql.txt',
  sql
)

console.log('Arquivo stickers_sql.txt criado!')
console.log('TOTAL:', values.length)