import { Injectable } from '@angular/core';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import { HttpClient } from '@angular/common/http';

function dot(data1: number[], data2: number[]) {
  let sum = 0;
  for (let i = 0; i < data1.length; i++) {
      sum += data1[i] * data2[i];
  }
  return sum;
}

export type BotName = 'maid'|'butler'|'chef';

interface IModelFetchResult {
  queryMap: {[query: string]: string};
  embeddingMap: {[query: string]: number[]};
}

@Injectable({
  providedIn: 'root'
})
export class BotResponseService {
  private readonly modelPromise = use.load();
  private readonly modelPromisesByBotName = {};
  private loadModelsPromise?: Promise<IModelFetchResult[]>;
  private minimumScore = 0.68;

  constructor(private http: HttpClient) { }

  private async loadModel(botName: BotName) {
    return this.http
      .get<IModelFetchResult>(`assets/models/${botName}.model.json`)
      .toPromise();
  }

  loadModels() {
    if (!this.loadModelsPromise) {
      this.loadModelsPromise = Promise.all(['maid', 'chef', 'butler'].map((botName: BotName) => {
        const promise = this.loadModel(botName);
        this.modelPromisesByBotName[botName] = promise;
        return promise;
      }));
    }
    return this.loadModelsPromise;
  }
  async getResponse(query: string, botName: BotName) {
    const {queryMap, embeddingMap} = await this.modelPromisesByBotName[botName.toLowerCase()];
    const model = await this.modelPromise;
    const queryEmbedding = await model.embed([query]);
    const queryArrays = await queryEmbedding.array();
    let maxScore = -Infinity;
    let bestMatch: string|undefined;
    for (const potentialMatch of Object.keys(embeddingMap)) {
      const score = dot(queryArrays[0], embeddingMap[potentialMatch]);
      if (score > maxScore) {
        maxScore = score;
        bestMatch = potentialMatch;
      }
    }

    // tslint:disable-next-line: no-console
    console.info('Best match: "' + bestMatch + '" with score ' + maxScore);
    if (bestMatch === undefined || maxScore < this.minimumScore) {
      if (maxScore < this.minimumScore) {
        // tslint:disable-next-line: no-console
        console.info('Ignoring match because its score is below the threshhold of ' + this.minimumScore);
      }
      return undefined;
    }
    return queryMap[bestMatch];
  }
}
