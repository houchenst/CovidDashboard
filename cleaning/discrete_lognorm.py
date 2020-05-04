import numpy as np
import matplotlib.pyplot as plt

mu = 1.63
sigma = 0.5
sample_size = 100000
filter_width = 20

def lognorm_filter():
    np.random.seed(0)
    samples = np.random.lognormal(mean=mu, sigma=sigma, size=sample_size)

    distr = np.zeros((2*filter_width) + 1)

    for i in range(samples.shape[0]):
        ith_sample = int(round(samples[i]))
        if ith_sample > filter_width:
            # print("out of range")
            ith_sample = filter_width
        distr[filter_width+ith_sample] += 1

    distr = distr/np.sum(distr)
    return distr


if __name__=="__main__":
    distr = lognorm_filter()
    print(distr)

    bar_bases = np.arange(-filter_width, filter_width+1, 1)

    plt.Figure()
    plt.bar(bar_bases, distr)
    plt.show()


