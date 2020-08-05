import * as FS from 'fs-extra'
import * as Path from 'path'

const Sweet = {
  db_name: '',
  databases: {},
  models: {},
  templates: {},
  Database: class {
    public type (variable: any): string {
      if (typeof variable === 'object') {
        if (variable instanceof Map) {
          return 'map'
        } else if (variable instanceof Array) {
          return 'array'
        }
      } else {
        return typeof variable
      }
    }
  
    constructor (name: string = Sweet.db_name) {
      Sweet.databases[name] = {}
      Sweet.db_name = name
    }
  
    public get (name: string, object: Object = {}): Array<Object> {
      const array = []
      let db_name = '',
        table_name = ''
      if (name.split(':').length === 2) {
        db_name = name.split(':')[0]
        table_name = name.split(':')[1]
      } else {
        db_name = Sweet.db_name
        table_name = name
      }
      for (const table_item of Sweet.databases[db_name][table_name]) {
        let verify = 0
        for (const item in object) {
          if (object[item] === table_item[item]) ++verify
        }
        if (verify === Object.keys(object).length) array.push(table_item)
      }
      return array
    }
  
    public remove (name: string, object: Object = {}): void {
      let db_name = '',
        table_name = ''
      if (name.split(':').length === 2) {
        db_name = name.split(':')[0]
        table_name = name.split(':')[1]
      } else {
        db_name = Sweet.db_name
        table_name = name
      }
      const indexes = this.get(db_name + ':' + table_name, object).map(x => this.get(db_name + ':' + table_name).indexOf(x))
      Sweet.databases[db_name][table_name] = Sweet.databases[db_name][table_name].filter((x, index) => !indexes.includes(index))
      return
    }
  
    public update (name: string, object: Object = {}, values: Object = {}): void {
      let db_name = '',
        table_name = ''
      if (name.split(':').length === 2) {
        db_name = name.split(':')[0]
        table_name = name.split(':')[1]
      } else {
        db_name = Sweet.db_name
        table_name = name
      }
      const indexes = this.get(db_name + ':' + table_name, object).map(x => this.get(db_name + ':' + table_name).indexOf(x))
      Sweet.databases[db_name][table_name].filter(function (x, index) {
        if (indexes.includes(index)) {
          for (const value in values) {
            if (x[value]) {
              x[value] = values[value]
            }
          }
        }
      })
      return
    }
  
    public set (name: string, informations: Object = Sweet.models[Sweet.db_name][name]): void {
      let db_name = '',
        table_name = ''
      if (name.split(':').length === 2) {
        db_name = name.split(':')[0]
        table_name = name.split(':')[1]
      } else {
        db_name = Sweet.db_name
        table_name = name
      }
      Sweet.databases[db_name][table_name].push({})
      for (const model_item in Sweet.models[db_name][table_name]) {
        const model = Sweet.models[db_name][table_name][model_item]
        if (!informations[model_item] && Boolean(model.required)) 
          throw new Error(`${model_item.slice(0, 1).toUpperCase() + model_item.slice(1)} field is required!`)
  
        if (Boolean(model.required) && this.type(informations[model_item]) !== model.type) 
          throw new Error(`${model_item.slice(0, 1).toUpperCase() + model_item.slice(1)} type must be ${model.type}, received ${this.type(informations[model_item])}.`)
  
        if (Boolean(model.required) && model.maximum_length && model.minimum_length && (informations[model_item].length < Number(model.minimum_length)) || informations[model_item].length > Number(model.maximum_length))
          throw new Error(`${model_item.slice(0, 1).toUpperCase() + model_item.slice(1)} length must be between ${model.length.min} and ${model.length.max}, received ${informations[model_item].length}.`)
  
        if (Boolean(model.required) && Sweet.templates[model.template] && !informations[model_item].match(Sweet.templates[model.template])) 
          throw new Error(`${model_item.slice(0, 1).toUpperCase() + model_item.slice(1)} field does not match ${model.template} template.`)
  
        Sweet.databases[db_name][table_name].slice(-1)[0][model_item] = informations[model_item]
      }
      return
    }
  },
  Field: class {

    constructor (name: string, field: string, model: Object) {
      let db_name = '',
        table_name = ''
      if (name.split(':').length === 2) {
        db_name = name.split(':')[0]
        table_name = name.split(':')[1]
      } else {
        db_name = Sweet.db_name
        table_name = name
      }
      Sweet.models[db_name][table_name][field] = model[field]
      for (const item of Sweet.databases[db_name][table_name]) {
        if (!item[field]) {
          if (model[field].type === 'map') {
            item[field] = new Map()
          } else if (model[field].type === 'array') {
            item[field] = []
          } else if (model[field].type === 'string') {
            item[field] = ''
          } else if (model[field].type === 'number') {
            item[field] = 0
          } else if (item[field].type === 'boolean') {
            item[field] = false
          }
        }
      }
    }
  },
  Table: class {

    constructor (name: string, model: Object = {}) {
      let db_name = '',
        table_name = ''
      if (name.split(':').length === 2) {
        db_name = name.split(':')[0]
        table_name = name.split(':')[1]
      } else {
        db_name = Sweet.db_name
        table_name = name
      }
      if (Sweet.databases[db_name][table_name]) throw new Error(`Table ${name} already exists!`)
      Sweet.databases[db_name][table_name] = []
      if (!Sweet.models[db_name]) Sweet.models[db_name] = {}
      Sweet.models[db_name][table_name] = model
    }
  },
  Template: class {
  
    constructor (name: string, regex: RegExp) {
      
      Sweet.templates[name] = regex
    }
  
  },
  Save: class {

    constructor () { }

    public latest () : Promise<string>{
      return new Promise (function (resolve, reject) {
        const path = Path.resolve(Path.join(__dirname, 'temp'))
        FS.exists(path, function (exists) {
          if (!exists) {
            FS.mkdirSync(Path.resolve(Path.join(__dirname, 'temp')))
            return resolve(undefined)
          }
          FS.readdir(path, function (error, content) {
            if (error) reject(error)
            if (content.length === 0) return resolve(undefined)
            const latestFile = content.reduce(function (last, current) {

              const currentFileDate = new Date(FS.statSync(Path.join(path, current)).mtime)
              const lastFileDate = new Date(FS.statSync(Path.join(path, last)).mtime)

              return (currentFileDate.getTime() > lastFileDate.getTime()) ? current : last
            })
            resolve(latestFile)
          })
        })
      })
    }

    public async load () {
      const latest = await this.latest()
      console.log(latest)
    }

    public async save () {
      return new Promise (function (resolve, reject) {
        const path = Path.resolve(Path.join(__dirname, 'temp'))
        FS.exists(path, async function (exists) {
          if (!exists) FS.mkdirSync(Path.resolve(Path.join(__dirname, 'temp')))
            const latestFile = await (new Sweet.Save()).latest()
            if (latestFile !== undefined) {
              const latestFileContent = await FS.readFile(Path.join(path, latestFile), 'utf-8')
              const currentFileContent = JSON.stringify(Sweet.databases)
              if (latestFileContent === currentFileContent) {
                return resolve()
              }
            }
            await FS.writeFile(Path.join(path, Date.now().toString() + '.json'), JSON.stringify(Sweet.databases), function (error) {
              if (error) reject(error)
              resolve()
            })
        })
      })
    }

  }
}

export default Sweet