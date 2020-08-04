import { Tokenizer } from './parser'
import Tokens from './tokens/tokens'
import { Token } from './scanner'
import Database from './database'
import * as FS from 'fs'
import * as path from 'path'

export default class SweetDB {

  private content: Array<string> = []
  private code: Array<string> = []

  constructor () {

    Tokenizer.addTokenSet(Tokens)

  }


  public load (file: string = '') {
    this.content = FS.readFileSync(path.resolve(file), 'utf-8')
      .split(/\r?\n/g)
      .filter(x => x.trim().length > 0)
    let context: Array<string> = [],
      current_field: string = '',
      current_table: string = '',
      current_field_name: string = '',
      current_template_name: string = ''
    for (const index in this.content) {
      if (this.content.hasOwnProperty(index)) {
        let line: string = this.content[index],
          tokens: Array<Token> = Tokenizer.tokenize(line),
          built: any = []

        for (const token_index in tokens) {
          if (tokens.hasOwnProperty(token_index)) {
            const item: Token = tokens[token_index],
              value: string = item.value,
              token: string = item.token

            if (!token) throw new Error(value)

            switch (token) {
              case 'DATABASE': {
                const database_name = value
                  .split(/(db|database)/i)
                  .slice(-1)[0]
                  .trim()
                  .replace('{', '')
                  .trim()
                Database.create_database(database_name)
                break
              }
              case 'TABLE': {
                const table_name = value
                  .split(/table/i)
                  .slice(-1)[0]
                  .trim()
                  .replace('{', '')
                  .trim()
                Database.create_table(table_name)
                current_table = table_name
                break
              }
              case 'FIELD': {
                const field_name = value
                  .split(/field/i)
                  .slice(-1)[0]
                  .trim()
                  .replace('{', '')
                  .trim()
                current_field += `{"${field_name}": {`
                current_field_name = field_name
                context.push('FIELD')
                break
              }
              case 'TEMPLATE': {
                const template_name = value
                  .split(/template/i)
                  .slice(-1)[0]
                  .trim()
                  .replace('{', '')
                  .trim()
                current_template_name = template_name
                context.push('TEMPLATE')
                break
              }
              case 'PARAM': {
                const item = value
                  .split(/-\s+/i)[1]
                  .split(/=>/)
                  .map(x => x.trim())
                const property = item[0]
                  .split(/\s+/g)
                  .join('_')
                const property_value = item[1]
                if (context.includes('FIELD')) {
                  current_field += `"${property}": "${property_value}",`
                } else if (context.includes('TEMPLATE')) {
                  if (property === 'regex') {
                    Database.create_template(current_template_name, new RegExp(property_value))
                  }
                }
                break
              }
              case 'CLOJURE': {
                if (context.includes('FIELD')) {
                  context.pop()
                  current_field = current_field.slice(0, current_field.length - 1)
                  current_field += '}}'
                  Database.set_table_model(current_table, current_field_name, JSON.parse(current_field))
                  current_field = ''
                }
                break
              }
            }

          }
        }

      }

    }
  
    return Database

  }

}