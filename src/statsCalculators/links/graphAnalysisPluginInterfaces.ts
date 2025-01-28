import { LinkStatFunction } from "src/internal"
import Graphology from 'graphology';

export interface GraphAnalysisPlugin {
    g: GraphologyGraphAnalysis
}

export interface CoCitation {
    sentence: string[]
    measure: number
    source: string
    line: number
}

export interface CoCitationRes {
    measure: number
    resolved: boolean
    coCitations: {
        sentence: string[]
        measure: number
        source: string
        line: number
    }[]
}

export interface CoCitationMap {
    [linkName: string]: CoCitationRes
}
  
export interface ResultMap {
    [to: string]: { measure: number; extra: string[] }
}

export interface GraphologyGraphAnalysis extends Graphology {
    algs: Record<LinkStatFunction, (source: string) => Promise<ResultMap | CoCitationMap>>;
}