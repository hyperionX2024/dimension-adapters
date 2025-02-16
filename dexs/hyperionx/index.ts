import { Adapter } from "../../adapters/types";
import { CHAIN } from "../../helpers/chains";
import { request, gql, GraphQLClient } from "graphql-request";
import type { ChainEndpoints } from "../../adapters/types";
import { Chain } from "@defillama/sdk/build/general";

const headers = { 'sex-dev': 'ServerDev'}

const endpoints = {
  [CHAIN.ZKFAIR]: 'https://gql.hyperionx.xyz/subgraphs/name/hyperionx/zkfair',
};

const blockNumberGraph = {
    [CHAIN.ZKFAIR]: 'https://gql.hyperionx.xyz/subgraphs/name/hyperionx/zkfair-blocks',
}

const graphs = (graphUrls: ChainEndpoints) => {
  return (chain: Chain) => {
    return async (timestamp: number) => {

      if (chain === CHAIN.ZKFAIR) {
        // Get blockNumers
        const blockNumerQuery = gql`
        {
            blocks(
              where: {timestamp_lte:${timestamp}}
              orderBy: timestamp
              orderDirection: desc
              first: 1
            ) {
              id
              number
            }
          }
        `;
        const last24hBlockNumberQuery = gql`
        {
            blocks(
              where: {timestamp_lte:${timestamp - 24 * 60 * 60}}
              orderBy: timestamp
              orderDirection: desc
              first: 1
            ) {
              id
              number
            }
          }
        `;

        const blockNumberGraphQLClient = new GraphQLClient(blockNumberGraph[chain], {
          headers: headers,
        });
        const graphQLClient = new GraphQLClient(graphUrls[chain], {
          headers: headers,
        });


        const blockNumber = (
          await blockNumberGraphQLClient.request(blockNumerQuery)
        ).blocks[0].number;
        const last24hBlockNumber = (
          await blockNumberGraphQLClient.request(last24hBlockNumberQuery)
        ).blocks[0].number;


        // get total volume
        const tradeVolumeQuery = gql`
            {
              protocolMetrics(block:{number:${blockNumber}}){
                totalVolume
              }
            }
          `;

        // get total volume 24 hours ago
      const lastTradeVolumeQuery = gql`
          {
            protocolMetrics(block:{number:${last24hBlockNumber}}){
              totalVolume
            }
          }
        `;


        let tradeVolume = (
          await graphQLClient.request(tradeVolumeQuery)
        ).protocolMetrics[0].totalVolume

        let last24hTradeVolume = (
          await graphQLClient.request(lastTradeVolumeQuery)
        ).protocolMetrics[0].totalVolume

        const totalVolume = Number(tradeVolume) / 10 ** 6
        const dailyVolume = (Number(tradeVolume) - Number(last24hTradeVolume)) / 10 ** 6

        return {
          timestamp,
          totalVolume: totalVolume.toString(),
          dailyVolume: dailyVolume.toString(),
        };
      }


      return {
        timestamp,
        totalVolume: "0",
        dailyVolume: "0",
      };
    };
  };
};

const adapter: Adapter = {
  adapter: {
    [CHAIN.ZKFAIR]: {
      fetch: graphs(endpoints)(CHAIN.ZKFAIR),
      start: async () => 6544259,
    },
  },
};

export default adapter;
