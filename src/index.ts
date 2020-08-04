import Sweet from './core/transpiler'
const db = new Sweet().load('tests/db.sweet')

db.set('Palamazon:Users', {
  username: 'NessMC',
  password: '123456789',
  email: 'contact@nessmc.fr'
})

db.create_field('Palamazon:Users', 'age', {
  age: {
    type: 'number',
    required: true
  }
})

console.log(db.get('Palamazon:Users'))