import type { PartialMessage } from '@bufbuild/protobuf';
import { ConnectError } from '@connectrpc/connect';
import { createConnectInfiniteQueryKey, useMutation } from '@connectrpc/connect-query';
import {
  useQueryClient,
  useMutation as useTanstackMutation,
  useQuery as useTanstackQuery,
} from '@tanstack/react-query';
import { config } from 'config';
import { createTopic, listTopics } from 'protogen/redpanda/api/dataplane/v1/topic-TopicService_connectquery';
import {
  type CreateTopicRequest,
  ListTopicsRequest,
  type ListTopicsResponse,
  ListTopicsResponse_Topic,
} from 'protogen/redpanda/api/dataplane/v1/topic_pb';
import { MAX_PAGE_SIZE, type QueryOptions } from 'react-query/react-query.utils';
import { useInfiniteQueryWithAllPages } from 'react-query/use-infinite-query-with-all-pages';
import type { GetTopicsResponse } from 'state/restInterfaces';
import { TOASTS, formatToastErrorMessageGRPC, showToast } from 'utils/toast.utils';

/**
 * We need to use legacy API to list topics for now
 * because of authorization that is only possible with Console v3 and above.
 * TODO: Remove once Console v3 is released.
 */
export const useLegacyListTopicsQuery = (
  _input?: PartialMessage<ListTopicsRequest>,
  options?: QueryOptions<ListTopicsRequest, ListTopicsResponse, ListTopicsResponse>,
  { includeInternalTopics = false }: { includeInternalTopics?: boolean } = {},
) => {
  const listTopicsRequest = new ListTopicsRequest({
    pageSize: MAX_PAGE_SIZE,
    pageToken: '',
  });

  const infiniteQueryKey = createConnectInfiniteQueryKey(listTopics, listTopicsRequest);

  const legacyListTopicsResult = useTanstackQuery<GetTopicsResponse>({
    // We need to precisely match the query key provided by other parts of connect-query
    queryKey: infiniteQueryKey,
    queryFn: async () => {
      const response = await fetch(`${config.restBasePath}/topics`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.jwt}`,
        },
      });

      const data = await response.json();

      return data;
    },
    enabled: options?.enabled,
  });

  const allRetrievedTopics: ListTopicsResponse_Topic[] =
    legacyListTopicsResult.data?.topics.map(
      (topic) =>
        new ListTopicsResponse_Topic({
          name: topic.topicName,
          internal: topic.isInternal,
          partitionCount: topic.partitionCount,
          replicationFactor: topic.replicationFactor,
        }),
    ) ?? [];

  const topics = includeInternalTopics
    ? allRetrievedTopics
    : allRetrievedTopics?.filter((topic) => !topic.internal && !topic.name.startsWith('_'));

  return {
    ...legacyListTopicsResult,
    data: {
      topics,
    },
  };
};

interface ListTopicsExtraOptions {
  hideInternalTopics?: boolean;
}

/**
 * WARNING: Only use once Console v3 is released.
 */
export const useListTopicsQuery = (
  input?: PartialMessage<ListTopicsRequest>,
  options?: QueryOptions<ListTopicsRequest, ListTopicsResponse, ListTopicsResponse>,
  { hideInternalTopics = false }: ListTopicsExtraOptions = {},
) => {
  const listTopicsRequest = new ListTopicsRequest({
    pageSize: MAX_PAGE_SIZE,
    pageToken: '',
    ...input,
  });

  const listTopicsResult = useInfiniteQueryWithAllPages(listTopics, listTopicsRequest, {
    pageParamKey: 'pageToken',
    enabled: options?.enabled,
  });

  const allRetrievedTopics = listTopicsResult?.data?.pages?.flatMap(({ topics }) => topics);

  const topics = hideInternalTopics
    ? allRetrievedTopics?.filter((topic) => !topic.internal && !topic.name.startsWith('_'))
    : allRetrievedTopics;

  return {
    ...listTopicsResult,
    data: {
      topics,
    },
  };
};

/**
 * We need to use legacy API to create topics for now
 * because of authorization that is only possible with Console v3 and above.
 * TODO: Remove once Console v3 is released.
 */
export const useLegacyCreateTopicMutationWithToast = () => {
  const queryClient = useQueryClient();

  return useTanstackMutation({
    mutationFn: async (request: CreateTopicRequest) => {
      const legacyRequestBody = {
        topicName: request.topic?.name, // Need to map to topicName for legacy API
        partitionCount: request.topic?.partitionCount,
        replicationFactor: request.topic?.replicationFactor,
        configs: request.topic?.configs,
      };
      const response = await fetch(`${config.restBasePath}/topics`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(legacyRequestBody),
      });

      const data = await response.json();

      await queryClient.invalidateQueries({
        queryKey: [listTopics.service.typeName],
        exact: false,
      });

      return data;
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [listTopics.service.typeName],
        exact: false,
      });

      showToast({
        id: TOASTS.TOPIC.CREATE.SUCCESS,
        resourceName: variables?.topic?.name,
        title: 'Topic created successfully',
        status: 'success',
      });
    },
    onError: (error, variables) => {
      const connectError = ConnectError.from(error);
      showToast({
        id: TOASTS.TOPIC.CREATE.ERROR,
        resourceName: variables?.topic?.name,
        title: formatToastErrorMessageGRPC({
          error: connectError,
          action: 'create',
          entity: 'topic',
        }),
        status: 'error',
      });
    },
  });
};

/**
 * WARNING: Only use once Console v3 is released.
 */
export const useCreateTopicMutationWithToast = () => {
  const queryClient = useQueryClient();

  return useMutation(createTopic, {
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [listTopics.service.typeName],
        exact: false,
      });

      showToast({
        id: TOASTS.TOPIC.CREATE.SUCCESS,
        resourceName: variables?.topic?.name,
        title: 'Topic created successfully',
        status: 'success',
      });
    },
    onError: (error, variables) => {
      showToast({
        id: TOASTS.TOPIC.CREATE.ERROR,
        resourceName: variables?.topic?.name,
        title: formatToastErrorMessageGRPC({
          error,
          action: 'create',
          entity: 'topic',
        }),
        status: 'error',
      });
    },
  });
};
