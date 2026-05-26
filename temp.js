fetch('https://whatsapp.eburon.ai/docs/openAPI.json').then(res => res.text()).then(text => require('fs').writeFileSync('openAPI.json', text))
